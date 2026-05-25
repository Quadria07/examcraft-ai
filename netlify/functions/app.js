import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import serverless from 'serverless-http'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { connectToDatabase } from '../../server/config/db.js'
import User from '../../server/models/User.js'

const app = express()

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection in Netlify function:', reason)
})
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in Netlify function:', error)
})

console.log('Netlify function starting. Environment availability:', {
  MONGODB_URI: !!process.env.MONGODB_URI,
  JWT_SECRET: !!process.env.JWT_SECRET,
  REGISTRATION_INVITE_CODE: !!process.env.REGISTRATION_INVITE_CODE,
  GROQ_API_KEY: !!(process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY),
})

app.use(cors({ origin: true, credentials: true }))
app.options('*', cors({ origin: true, credentials: true }))
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  next()
})
app.use(express.json())

const JWT_SECRET = process.env.JWT_SECRET
const INVITE_CODE = process.env.REGISTRATION_INVITE_CODE
const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY
const SECURE_COOKIES = process.env.NODE_ENV !== 'development'
const COOKIE_SAME_SITE = 'none'

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET environment variable')
}

if (!GROQ_API_KEY) {
  throw new Error('Missing Groq API key environment variable')
}

const setAuthCookie = (res, token) => {
  const cookieParts = [
    `examcraft_token=${encodeURIComponent(token)}`,
    'HttpOnly',
    `Path=/`,
    `Max-Age=${7 * 24 * 60 * 60}`,
    `SameSite=${COOKIE_SAME_SITE}`,
  ]
  if (SECURE_COOKIES) {
    cookieParts.push('Secure')
  }
  res.setHeader('Set-Cookie', cookieParts.join('; '))
}

const clearAuthCookie = (res) => {
  const cookieParts = [
    'examcraft_token=',
    'HttpOnly',
    `Path=/`,
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    `SameSite=${COOKIE_SAME_SITE}`,
  ]
  if (SECURE_COOKIES) {
    cookieParts.push('Secure')
  }
  res.setHeader('Set-Cookie', cookieParts.join('; '))
}

const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {}
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .map((cookie) => {
        const [name, ...rest] = cookie.split('=')
        return [name, decodeURIComponent(rest.join('='))]
      })
  )
}

const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization
  const cookies = parseCookies(req.headers.cookie)
  let token = null

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  } else if (cookies.examcraft_token) {
    token = cookies.examcraft_token
  }

  if (!token) {
    return res.status(401).json({ message: 'Authorization token required' })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.userId
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

const createToken = (user) => jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })

const safeJsonArray = (text) => {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1) {
    throw new Error('Unable to parse array from model response')
  }
  return JSON.parse(text.slice(start, end + 1))
}

const callGroq = async (messages, maxTokens = 5000) => {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  })

  if (response.status === 429) {
    const error = new Error('RATE_LIMIT')
    error.status = 429
    throw error
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error?.message || 'Groq request failed')
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ''
}

app.post('/api/auth/register', async (req, res) => {
  const { email, password, inviteCode } = req.body
  if (!email || !password || !inviteCode) {
    return res.status(400).json({ message: 'Email, password, and invite code are required' })
  }
  if (!INVITE_CODE || inviteCode !== INVITE_CODE) {
    return res.status(403).json({ message: 'Invalid invitation code' })
  }

  await connectToDatabase()
  const existing = await User.findOne({ email: email.toLowerCase().trim() })
  if (existing) {
    return res.status(409).json({ message: 'Email already registered' })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await User.create({
    email: email.toLowerCase().trim(),
    passwordHash,
    data: {
      subjects: [],
      practiceLibrary: [],
      passMarkPercent: 70,
      activeExamSession: null,
      settings: {},
    },
  })

  const token = createToken(user)
  setAuthCookie(res, token)

  return res.status(201).json({ user: { email: user.email, data: user.data } })
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  await connectToDatabase()
  const user = await User.findOne({ email: email.toLowerCase().trim() })
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const token = createToken(user)
  setAuthCookie(res, token)

  return res.json({ user: { email: user.email, data: user.data } })
})

app.get('/api/auth/me', verifyAuth, async (req, res) => {
  await connectToDatabase()
  const user = await User.findById(req.userId)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }
  return res.json({ email: user.email, data: user.data })
})

app.post('/api/auth/logout', verifyAuth, async (req, res) => {
  clearAuthCookie(res)
  return res.json({ message: 'Logged out' })
})

app.get('/api/session', verifyAuth, async (req, res) => {
  await connectToDatabase()
  const user = await User.findById(req.userId)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }
  return res.json({ session: user.data.activeExamSession || null })
})

app.put('/api/session', verifyAuth, async (req, res) => {
  const { session } = req.body
  await connectToDatabase()
  const user = await User.findById(req.userId)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  user.data.activeExamSession = session || null
  await user.save()
  return res.json({ session: user.data.activeExamSession })
})

app.delete('/api/session', verifyAuth, async (req, res) => {
  await connectToDatabase()
  const user = await User.findById(req.userId)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  user.data.activeExamSession = null
  await user.save()
  return res.json({ session: null })
})

app.get('/api/data', verifyAuth, async (req, res) => {
  await connectToDatabase()
  const user = await User.findById(req.userId)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }
  return res.json({ data: user.data })
})

app.put('/api/data', verifyAuth, async (req, res) => {
  const { subjects, practiceLibrary, passMarkPercent } = req.body
  await connectToDatabase()
  const user = await User.findById(req.userId)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  if (Array.isArray(subjects)) {
    user.data.subjects = subjects
  }
  if (Array.isArray(practiceLibrary)) {
    user.data.practiceLibrary = practiceLibrary
  }
  if (typeof passMarkPercent === 'number') {
    user.data.passMarkPercent = passMarkPercent
  }

  await user.save()
  return res.json({ data: user.data })
})

app.post('/api/groq/questions', verifyAuth, async (req, res) => {
  const { material, config } = req.body
  if (!material || typeof material !== 'string') {
    return res.status(400).json({ message: 'Material text is required' })
  }

  const mcqCount = Number(config?.mcqCount) || 12
  const fitbCount = Number(config?.fitbCount) || 6
  const tfCount = Number(config?.tfCount) || 1
  const ynCount = Number(config?.ynCount) || 1
  const totalCount = mcqCount + fitbCount + tfCount + ynCount
  const difficulty = String(config?.difficulty || 'medium').trim().toUpperCase()

  const systemPrompt = `You are a university lecturer creating exam questions from provided course material. You must only use the material, not invent facts. Return EXACTLY ${totalCount} questions in a JSON array. Use the following question types and counts: ${mcqCount} multiple-choice, ${fitbCount} fill-in-the-blank, ${tfCount} true/false, ${ynCount} yes/no. The response must be ONLY valid JSON with no extra text.`

  const userPrompt = `Create ${mcqCount} multiple-choice questions, ${fitbCount} fill-in-the-blank questions, ${tfCount} true/false questions, and ${ynCount} yes/no questions from this material:\n\n${material}\n\nRequirements:\n- Return only a JSON array of objects.\n- Each object must include: type, question, answer, difficulty, bloomLevel.\n- For MCQ, include options: an array of 4 answer choices. The answer must exactly match the correct option text.\n- For true/false, use type 'true_false' and answer 'True' or 'False'.\n- For yes/no, use type 'yes_no' and answer 'Yes' or 'No'.\n- For fill-in-the-blank, use type 'fitb' and provide the exact missing phrase in answer.\n- Use type values exactly: mcq, fitb, true_false, yes_no.\n- Set difficulty for every question to '${difficulty}'.\n- Do not include commentary or explanation outside the JSON array.`

  try {
    const rawContent = await callGroq([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 6000)

    const questions = safeJsonArray(rawContent)
    return res.json({ questions })
  } catch (error) {
    if (error.status === 429) {
      return res.status(429).json({ message: 'Groq rate limit reached' })
    }
    return res.status(500).json({ message: error.message || 'Question generation failed' })
  }
})

app.post('/api/groq/explain', verifyAuth, async (req, res) => {
  const { question, material } = req.body
  if (!question || !material) {
    return res.status(400).json({ message: 'Question and material are required' })
  }

  const prompt = `As an expert academic tutor, explain the answer to this question based on the material provided.\nQUESTION: ${question.question}\nCORRECT ANSWER: ${question.answer}`

  try {
    const explanation = await callGroq([
      { role: 'system', content: 'Provide clear, concise explanations.' },
      { role: 'user', content: prompt },
    ], 1200)
    return res.json({ explanation: explanation.trim() })
  } catch (error) {
    if (error.status === 429) {
      return res.status(429).json({ message: 'Groq rate limit reached' })
    }
    return res.status(500).json({ message: error.message || 'Explanation failed' })
  }
})

app.post('/api/groq/units', verifyAuth, async (req, res) => {
  const { content } = req.body
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ message: 'Material content is required' })
  }

  const prompt = 'Analyze course material and divide it into units. Return a JSON array of objects: [{ "title": "Unit Title", "material": "..." }].'

  try {
    const rawContent = await callGroq([
      { role: 'system', content: prompt },
      { role: 'user', content: content.substring(0, 10000) },
    ], 8000)

    const units = safeJsonArray(rawContent)
    return res.json({ units })
  } catch (error) {
    if (error.status === 429) {
      return res.status(429).json({ message: 'Groq rate limit reached' })
    }
    return res.status(500).json({ message: error.message || 'Unit suggestion failed' })
  }
})

app.post('/api/groq/transform', verifyAuth, async (req, res) => {
  const { questionsList, targetType } = req.body
  if (!Array.isArray(questionsList) || !targetType) {
    return res.status(400).json({ message: 'Questions and target type are required' })
  }

  const prompt = `Transform questions into ${targetType.toUpperCase()}. Return a JSON array of objects with originalId, type, question, options, answer, explanation.`

  try {
    const rawContent = await callGroq([
      { role: 'system', content: prompt },
      { role: 'user', content: JSON.stringify(questionsList.map((q) => ({ id: q.id, text: q.question, answer: q.answer }))) },
    ], 4000)

    const transformed = safeJsonArray(rawContent)
    return res.json({ questions: transformed })
  } catch (error) {
    if (error.status === 429) {
      return res.status(429).json({ message: 'Groq rate limit reached' })
    }
    return res.status(500).json({ message: error.message || 'Transformation failed' })
  }
})

app.post('/api/groq/practice/extract', verifyAuth, async (req, res) => {
  const { importText } = req.body
  if (!importText || typeof importText !== 'string') {
    return res.status(400).json({ message: 'Import text is required' })
  }

  const prompt = `Extract questions and answers from the text provided. CRITICAL RULE 1: The question text MUST remain 100% identical to the source. CRITICAL RULE 2: For every question, you MUST provide a \"sourceQuote\" which is the exact sentence or fragment from the source text where the answer is found. CRITICAL RULE 3: DO NOT GUESS. If an answer is not physically written in the text, mark answer as \"[Needs Review]\". If the source HAS options (A, B, C, D), set \"type\": \"mcq\" and include the \"options\" array. Return ONLY a JSON array of objects: { \"question\": \"...\", \"answer\": \"...\", \"type\": \"...\", \"options\": [...], \"sourceQuote\": \"...\" }` 

  try {
    const rawContent = await callGroq([
      { role: 'system', content: prompt },
      { role: 'user', content: importText },
    ], 6000)

    const questions = safeJsonArray(rawContent)
    return res.json({ questions })
  } catch (error) {
    if (error.status === 429) {
      return res.status(429).json({ message: 'Groq rate limit reached' })
    }
    return res.status(500).json({ message: error.message || 'Practice extraction failed' })
  }
})

app.post('/api/groq/practice/validate', verifyAuth, async (req, res) => {
  const { importText, questions } = req.body
  if (!importText || !Array.isArray(questions)) {
    return res.status(400).json({ message: 'Import text and questions are required' })
  }

  const prompt = `Verify these extracted questions against the original source text. Update the \"confidence\" field (0-100) and add a \"validationNote\". Return ONLY JSON. Original Source: """${importText}"""` 

  try {
    const rawContent = await callGroq([
      { role: 'system', content: prompt },
      { role: 'user', content: JSON.stringify(questions) },
    ], 6000)

    const validated = safeJsonArray(rawContent)
    return res.json({ questions: validated })
  } catch (error) {
    if (error.status === 429) {
      return res.status(429).json({ message: 'Groq rate limit reached' })
    }
    return res.status(500).json({ message: error.message || 'Validation failed' })
  }
})

app.get('/api/test', (req, res) => {
  res.json({ status: 'ok' })
})

app.use((err, req, res, next) => {
  console.error('Express error handler caught an error:', err)
  if (res.headersSent) {
    return next(err)
  }
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' })
})

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' })
})

export const handler = serverless(app)
