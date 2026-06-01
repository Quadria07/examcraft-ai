import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import serverless from 'serverless-http'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { connectToDatabase } from '../../server/config/db.js'

// Netlify esbuild bundler wraps ESM default exports, unwrap them
const unwrap = (m) => (m && m.default ? m.default : m)

import _User from '../../server/models/User.js'
import _Subject from '../../server/models/Subject.js'
import _Unit from '../../server/models/Unit.js'
import _Question from '../../server/models/Question.js'
import _Attempt from '../../server/models/Attempt.js'
import _Course from '../../server/models/Course.js'
import _Module from '../../server/models/Module.js'
import _PracticeVersion from '../../server/models/PracticeVersion.js'
import _PracticeQuestion from '../../server/models/PracticeQuestion.js'
import _PracticeAttempt from '../../server/models/PracticeAttempt.js'

const User = unwrap(_User)
const Subject = unwrap(_Subject)
const Unit = unwrap(_Unit)
const Question = unwrap(_Question)
const Attempt = unwrap(_Attempt)
const Course = unwrap(_Course)
const Module = unwrap(_Module)
const PracticeVersion = unwrap(_PracticeVersion)
const PracticeQuestion = unwrap(_PracticeQuestion)
const PracticeAttempt = unwrap(_PracticeAttempt)

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
// Increase body limit to 5 MB — course material + questions can be large
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ limit: '5mb', extended: true }))

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

// Groq free-tier model fallback chain.
// If a model returns 429 (rate limited), the next model in the list is tried automatically.
// Models are ordered by quality first, then by daily token limit as a tiebreaker.
const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile',   label: 'Llama 3.3 70B'    }, // Primary    — 128K ctx, TPD 14,400
  { id: 'llama-3.1-8b-instant',      label: 'Llama 3.1 8B'     }, // Fallback 1 — 128K ctx, TPD 500,000
  { id: 'llama3-8b-8192',            label: 'Llama 3 8B'       }, // Fallback 2 —   8K ctx, TPD 14,400
  { id: 'llama3-70b-8192',           label: 'Llama 3 70B'      }, // Fallback 3 —   8K ctx, TPD 6,000
]

const callGroqWithModel = async (model, messages, maxTokens) => {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model.id,
      messages,
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  })

  if (response.status === 429) {
    console.warn(`[Groq] Model "${model.label}" is rate-limited, trying next fallback...`)
    const rateLimitError = new Error('RATE_LIMIT')
    rateLimitError.status = 429
    throw rateLimitError
  }

  // 404 means the model is deprecated or unavailable — skip to next fallback
  if (response.status === 404) {
    const data = await response.json().catch(() => ({}))
    const groqMsg = data.error?.message || 'model not found'
    console.warn(`[Groq] Model "${model.label}" unavailable (404): ${groqMsg} — trying next fallback...`)
    const notFoundError = new Error('MODEL_NOT_FOUND')
    notFoundError.status = 429 // treat like rate-limit so the chain continues
    throw notFoundError
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const errMsg = data.error?.message || `Groq request failed with model ${model.label}`
    console.error(`[Groq] Model "${model.label}" returned ${response.status}: ${errMsg}`)
    throw new Error(errMsg)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content ?? ''
  if (model.id !== GROQ_MODELS[0].id) {
    console.log(`[Groq] Successfully served by fallback model: ${model.label}`)
  }
  return content
}

const callGroq = async (messages, maxTokens = 5000) => {
  let lastError = null

  for (const model of GROQ_MODELS) {
    try {
      return await callGroqWithModel(model, messages, maxTokens)
    } catch (error) {
      lastError = error
      // Only continue the fallback chain on rate limit errors
      if (error.status !== 429) {
        throw error
      }
    }
  }

  // All models exhausted — surface a clear rate limit error
  console.error('[Groq] All models are rate-limited. No further fallbacks available.')
  const exhaustedError = new Error('All Groq models are currently rate-limited. Please try again later (limits reset at midnight UTC).')
  exhaustedError.status = 429
  throw exhaustedError
}

app.post('/api/auth/register', async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Register error:', error)
    return res.status(500).json({ message: 'Registration failed due to server error' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ message: 'Login failed', error: error.message })
  }
})

app.get('/api/auth/me', verifyAuth, async (req, res) => {
  try {
    await connectToDatabase()
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    return res.json({ email: user.email, data: user.data })
  } catch (error) {
    console.error('Auth/me error:', error)
    return res.status(500).json({ message: 'Authentication check failed' })
  }
})

app.post('/api/auth/logout', verifyAuth, async (req, res) => {
  try {
    clearAuthCookie(res)
    return res.json({ message: 'Logged out' })
  } catch (error) {
    console.error('Logout error:', error)
    return res.status(500).json({ message: 'Logout failed' })
  }
})

app.get('/api/session', verifyAuth, async (req, res) => {
  try {
    await connectToDatabase()
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    return res.json({ session: user.data.activeExamSession || null })
  } catch (error) {
    console.error('Get session error:', error)
    return res.status(500).json({ message: 'Failed to get session' })
  }
})

app.put('/api/session', verifyAuth, async (req, res) => {
  try {
    const { session } = req.body
    await connectToDatabase()
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    user.data.activeExamSession = session || null
    await user.save()
    return res.json({ session: user.data.activeExamSession })
  } catch (error) {
    console.error('Save session error:', error)
    return res.status(500).json({ message: 'Failed to save session' })
  }
})

app.delete('/api/session', verifyAuth, async (req, res) => {
  try {
    await connectToDatabase()
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    user.data.activeExamSession = null
    await user.save()
    return res.json({ session: null })
  } catch (error) {
    console.error('Delete session error:', error)
    return res.status(500).json({ message: 'Failed to clear session' })
  }
})

async function migrateUserLegacyData(userId, user) {
  const subjectsCount = await Subject.countDocuments({ userId })
  const coursesCount = await Course.countDocuments({ userId })
  
  let migrated = false

  if (subjectsCount === 0 && user.data?.subjects?.length > 0) {
    console.log(`[Lazy Migration] Migrating subjects for user ${userId}...`)
    migrated = true
    for (const s of user.data.subjects) {
      await Subject.updateOne({ id: s.id }, { name: s.name, userId }, { upsert: true })
      
      if (Array.isArray(s.units)) {
        for (const u of s.units) {
          await Unit.updateOne({ id: u.id }, {
            title: u.title,
            material: u.material || '',
            status: u.status || 'locked',
            bestScore: u.bestScore,
            subjectId: s.id
          }, { upsert: true })
          
          if (Array.isArray(u.questions)) {
            for (const q of u.questions) {
              await Question.updateOne({ id: q.id }, {
                type: q.type,
                question: q.question,
                options: q.options,
                answer: q.answer,
                difficulty: q.difficulty || 'medium',
                bloomLevel: q.bloomLevel || 'Remember',
                explanation: q.explanation || '',
                unitId: u.id
              }, { upsert: true })
            }
          }
          
          if (Array.isArray(u.attempts)) {
            for (const a of u.attempts) {
              await Attempt.updateOne({ id: a.id }, {
                timestamp: a.timestamp,
                responses: a.responses || {},
                flagged: a.flagged || {},
                score: a.score,
                percentage: a.percentage,
                completed: a.completed !== false,
                timeTaken: a.timeTaken || 0,
                difficulty: a.difficulty || 'medium',
                userId,
                unitId: u.id
              }, { upsert: true })
            }
          }
        }
      }
    }
  }
  
  if (coursesCount === 0 && user.data?.practiceLibrary?.length > 0) {
    console.log(`[Lazy Migration] Migrating practice library for user ${userId}...`)
    migrated = true
    for (const c of user.data.practiceLibrary) {
      await Course.updateOne({ id: c.id }, { name: c.name, userId }, { upsert: true })
      
      if (Array.isArray(c.modules)) {
        for (const m of c.modules) {
          await Module.updateOne({ id: m.id }, { name: m.name, courseId: c.id }, { upsert: true })
          
          if (Array.isArray(m.versions)) {
            for (const v of m.versions) {
              await PracticeVersion.updateOne({ id: v.id }, { name: v.name, type: v.type, moduleId: m.id }, { upsert: true })
              
              if (Array.isArray(v.questions)) {
                for (const q of v.questions) {
                  await PracticeQuestion.updateOne({ id: q.id }, {
                    type: q.type,
                    question: q.question,
                    options: q.options,
                    answer: q.answer,
                    explanation: q.explanation || '',
                    sourceQuote: q.sourceQuote || '',
                    confidence: q.confidence ?? 1.0,
                    versionId: v.id
                  }, { upsert: true })
                }
              }
              
              if (Array.isArray(v.attempts)) {
                for (const a of v.attempts) {
                  await PracticeAttempt.updateOne({ id: a.id }, {
                    score: a.score,
                    percentage: a.percentage,
                    responses: a.responses || {},
                    startTime: a.startTime,
                    endTime: a.endTime,
                    userId,
                    versionId: v.id
                  }, { upsert: true })
                }
              }
            }
          }
        }
      }
    }
  }
  
  if (migrated) {
    user.data.subjects = []
    user.data.practiceLibrary = []
    user.markModified('data')
    await user.save()
    console.log(`[Lazy Migration] Migration completed and legacy data cleared for user ${userId}.`)
  }
}

async function assembleUserAppData(userId, user) {
  await migrateUserLegacyData(userId, user)
  
  const subjectsList = await Subject.find({ userId }).lean()
  const populatedSubjects = []
  
  for (const s of subjectsList) {
    const units = await Unit.find({ subjectId: s.id }).lean()
    const populatedUnits = []
    
    for (const u of units) {
      const questions = await Question.find({ unitId: u.id }).lean()
      const attempts = await Attempt.find({ unitId: u.id }).lean()
      populatedUnits.push({
        ...u,
        questions: questions.map(q => ({ ...q, id: q.id, _id: undefined, __v: undefined })),
        attempts: attempts.map(a => ({ ...a, id: a.id, _id: undefined, __v: undefined }))
      })
    }
    populatedSubjects.push({
      ...s,
      _id: undefined,
      __v: undefined,
      units: populatedUnits
    })
  }
  
  const coursesList = await Course.find({ userId }).lean()
  const populatedCourses = []
  
  for (const c of coursesList) {
    const modules = await Module.find({ courseId: c.id }).lean()
    const populatedModules = []
    
    for (const m of modules) {
      const versions = await PracticeVersion.find({ moduleId: m.id }).lean()
      const populatedVersions = []
      
      for (const v of versions) {
        const questions = await PracticeQuestion.find({ versionId: v.id }).lean()
        const attempts = await PracticeAttempt.find({ versionId: v.id }).lean()
        populatedVersions.push({
          ...v,
          questions: questions.map(q => ({ ...q, id: q.id, _id: undefined, __v: undefined })),
          attempts: attempts.map(a => ({ ...a, id: a.id, _id: undefined, __v: undefined }))
        })
      }
      populatedModules.push({
        ...m,
        _id: undefined,
        __v: undefined,
        versions: populatedVersions
      })
    }
    populatedCourses.push({
      ...c,
      _id: undefined,
      __v: undefined,
      modules: populatedModules
    })
  }
  
  return {
    subjects: populatedSubjects,
    practiceLibrary: populatedCourses,
    passMarkPercent: user.data?.passMarkPercent ?? 70,
    activeExamSession: user.data?.activeExamSession ?? null,
    settings: user.data?.settings ?? {}
  }
}

async function saveUserAppData(userId, user, { subjects, practiceLibrary, passMarkPercent }) {
  if (typeof passMarkPercent === 'number') {
    user.data.passMarkPercent = passMarkPercent
    user.markModified('data')
    await user.save()
  }
  
  if (Array.isArray(subjects)) {
    const payloadSubjectIds = subjects.map(s => s.id)
    await Subject.deleteMany({ userId, id: { $nin: payloadSubjectIds } })
    
    for (const s of subjects) {
      await Subject.updateOne({ userId, id: s.id }, { name: s.name }, { upsert: true })
      
      if (Array.isArray(s.units)) {
        const payloadUnitIds = s.units.map(u => u.id)
        await Unit.deleteMany({ subjectId: s.id, id: { $nin: payloadUnitIds } })
        
        for (const u of s.units) {
          await Unit.updateOne({ id: u.id }, {
            title: u.title,
            material: u.material || '',
            status: u.status || 'locked',
            bestScore: u.bestScore,
            subjectId: s.id
          }, { upsert: true })
          
          if (Array.isArray(u.questions)) {
            const payloadQIds = u.questions.map(q => q.id)
            await Question.deleteMany({ unitId: u.id, id: { $nin: payloadQIds } })
            
            for (const q of u.questions) {
              await Question.updateOne({ id: q.id }, {
                type: q.type,
                question: q.question,
                options: q.options,
                answer: q.answer,
                difficulty: q.difficulty || 'medium',
                bloomLevel: q.bloomLevel || 'Remember',
                explanation: q.explanation || '',
                unitId: u.id
              }, { upsert: true })
            }
          } else {
            await Question.deleteMany({ unitId: u.id })
          }
          
          if (Array.isArray(u.attempts)) {
            const payloadAttemptIds = u.attempts.map(a => a.id)
            await Attempt.deleteMany({ unitId: u.id, id: { $nin: payloadAttemptIds } })
            
            for (const a of u.attempts) {
              await Attempt.updateOne({ id: a.id }, {
                timestamp: a.timestamp,
                responses: a.responses || {},
                flagged: a.flagged || {},
                score: a.score,
                percentage: a.percentage,
                completed: a.completed !== false,
                timeTaken: a.timeTaken || 0,
                difficulty: a.difficulty || 'medium',
                userId,
                unitId: u.id
              }, { upsert: true })
            }
          } else {
            await Attempt.deleteMany({ unitId: u.id })
          }
        }
      } else {
        await Unit.deleteMany({ subjectId: s.id })
      }
    }

    const activeSubjects = await Subject.find({ userId }).lean()
    const activeSubjectIds = activeSubjects.map(s => s.id)
    await Unit.deleteMany({ subjectId: { $nin: activeSubjectIds } })

    const activeUnits = await Unit.find({ subjectId: { $in: activeSubjectIds } }).lean()
    const activeUnitIds = activeUnits.map(u => u.id)
    await Question.deleteMany({ unitId: { $nin: activeUnitIds } })
    await Attempt.deleteMany({ userId, unitId: { $nin: activeUnitIds } })
  }
  
  if (Array.isArray(practiceLibrary)) {
    const payloadCourseIds = practiceLibrary.map(c => c.id)
    await Course.deleteMany({ userId, id: { $nin: payloadCourseIds } })
    
    for (const c of practiceLibrary) {
      await Course.updateOne({ userId, id: c.id }, { name: c.name }, { upsert: true })
      
      if (Array.isArray(c.modules)) {
        const payloadModuleIds = c.modules.map(m => m.id)
        await Module.deleteMany({ courseId: c.id, id: { $nin: payloadModuleIds } })
        
        for (const m of c.modules) {
          await Module.updateOne({ id: m.id }, { name: m.name, courseId: c.id }, { upsert: true })
          
          if (Array.isArray(m.versions)) {
            const payloadVersionIds = m.versions.map(v => v.id)
            await PracticeVersion.deleteMany({ moduleId: m.id, id: { $nin: payloadVersionIds } })
            
            for (const v of m.versions) {
              await PracticeVersion.updateOne({ id: v.id }, { name: v.name, type: v.type, moduleId: m.id }, { upsert: true })
              
              if (Array.isArray(v.questions)) {
                const payloadQIds = v.questions.map(q => q.id)
                await PracticeQuestion.deleteMany({ versionId: v.id, id: { $nin: payloadQIds } })
                
                for (const q of v.questions) {
                  await PracticeQuestion.updateOne({ id: q.id }, {
                    type: q.type,
                    question: q.question,
                    options: q.options,
                    answer: q.answer,
                    explanation: q.explanation || '',
                    sourceQuote: q.sourceQuote || '',
                    confidence: q.confidence ?? 1.0,
                    versionId: v.id
                  }, { upsert: true })
                }
              } else {
                await PracticeQuestion.deleteMany({ versionId: v.id })
              }
              
              if (Array.isArray(v.attempts)) {
                const payloadAttemptIds = v.attempts.map(a => a.id)
                await PracticeAttempt.deleteMany({ versionId: v.id, id: { $nin: payloadAttemptIds } })
                
                for (const a of v.attempts) {
                  await PracticeAttempt.updateOne({ id: a.id }, {
                    score: a.score,
                    percentage: a.percentage,
                    responses: a.responses || {},
                    startTime: a.startTime,
                    endTime: a.endTime,
                    userId,
                    versionId: v.id
                  }, { upsert: true })
                }
              } else {
                await PracticeAttempt.deleteMany({ versionId: v.id })
              }
            }
          } else {
            await PracticeVersion.deleteMany({ moduleId: m.id })
          }
        }
      } else {
        await Module.deleteMany({ courseId: c.id })
      }
    }

    const activeCourses = await Course.find({ userId }).lean()
    const activeCourseIds = activeCourses.map(c => c.id)
    await Module.deleteMany({ courseId: { $nin: activeCourseIds } })

    const activeModules = await Module.find({ courseId: { $in: activeCourseIds } }).lean()
    const activeModuleIds = activeModules.map(m => m.id)
    await PracticeVersion.deleteMany({ moduleId: { $nin: activeModuleIds } })

    const activeVersions = await PracticeVersion.find({ moduleId: { $in: activeModuleIds } }).lean()
    const activeVersionIds = activeVersions.map(v => v.id)
    await PracticeQuestion.deleteMany({ versionId: { $nin: activeVersionIds } })
    await PracticeAttempt.deleteMany({ userId, versionId: { $nin: activeVersionIds } })
  }
}

app.get('/api/data', verifyAuth, async (req, res) => {
  try {
    await connectToDatabase()
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    const assembledData = await assembleUserAppData(req.userId, user)
    return res.json({ data: assembledData })
  } catch (error) {
    console.error('Failed to get user data:', error)
    return res.status(500).json({ message: 'Failed to load library' })
  }
})

app.put('/api/data', verifyAuth, async (req, res) => {
  try {
    const { subjects, practiceLibrary, passMarkPercent } = req.body
    await connectToDatabase()
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    await saveUserAppData(req.userId, user, { subjects, practiceLibrary, passMarkPercent })
    const updatedData = await assembleUserAppData(req.userId, user)
    return res.json({ data: updatedData })
  } catch (error) {
    console.error('Failed to save user data:', error)
    return res.status(500).json({ message: 'Failed to save progress' })
  }
})

app.delete('/api/data', verifyAuth, async (req, res) => {
  try {
    await connectToDatabase()
    const userId = req.userId
    
    const userSubjects = await Subject.find({ userId }).select('id')
    const userSubjectIds = userSubjects.map(s => s.id)
    await Unit.deleteMany({ subjectId: { $in: userSubjectIds } })
    
    const userUnitsList = await Unit.find({ subjectId: { $in: userSubjectIds } }).select('id')
    const userUnitIds = userUnitsList.map(u => u.id)
    await Question.deleteMany({ unitId: { $in: userUnitIds } })
    
    const userCourses = await Course.find({ userId }).select('id')
    const userCourseIds = userCourses.map(c => c.id)
    await Module.deleteMany({ courseId: { $in: userCourseIds } })
    
    const userModules = await Module.find({ courseId: { $in: userCourseIds } }).select('id')
    const userModuleIds = userModules.map(m => m.id)
    await PracticeVersion.deleteMany({ moduleId: { $in: userModuleIds } })
    
    const userVersions = await PracticeVersion.find({ moduleId: { $in: userModuleIds } }).select('id')
    const userVersionIds = userVersions.map(v => v.id)
    await PracticeQuestion.deleteMany({ versionId: { $in: userVersionIds } })
    
    await Subject.deleteMany({ userId })
    await Course.deleteMany({ userId })
    await Attempt.deleteMany({ userId })
    await PracticeAttempt.deleteMany({ userId })

    const user = await User.findById(userId)
    if (user) {
      user.data = {
        subjects: [],
        practiceLibrary: [],
        passMarkPercent: 70,
        activeExamSession: null,
        settings: {}
      }
      user.markModified('data')
      await user.save()
    }

    return res.json({ message: 'All system data wiped successfully' })
  } catch (error) {
    console.error('Failed to wipe user data:', error)
    return res.status(500).json({ message: 'Failed to wipe system data' })
  }
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

  let typeDetails = ''
  if (targetType === 'mcq') {
    typeDetails = 'Convert every question into a Multiple-Choice Question (MCQ). You MUST provide an "options" array with exactly 4 options, and the "answer" MUST be the exact text of one of those options. The "type" field MUST be "mcq".'
  } else if (targetType === 'fitb') {
    typeDetails = 'Convert every question into a Fill-in-the-Blank (FITB) question. The question text should contain a blank space (like "___"). The "answer" MUST be the exact word or phrase that completes the blank. The "options" array MUST be null. The "type" field MUST be "fitb".'
  } else if (targetType === 'true_false') {
    typeDetails = 'Convert every question into a True/False question. The question should be a statement that is either True or False. The "options" array MUST be ["True", "False"]. The "answer" MUST be exactly either "True" or "False". The "type" field MUST be "true_false".'
  } else if (targetType === 'yes_no') {
    typeDetails = 'Convert every question into a Yes/No question. The question should be a direct question requiring a Yes/No. The "options" array MUST be ["Yes", "No"]. The "answer" MUST be exactly either "Yes" or "No". The "type" field MUST be "yes_no".'
  }

  const prompt = `You are a professional educational assessment engine.
Your task is to transform all provided questions into the target format: ${targetType.toUpperCase()}.
Here are the specific requirements for this format:
${typeDetails}

Return ONLY a valid JSON array of objects. Each object in the array MUST have the following structure:
{
  "originalId": "the ID of the original question from the input",
  "type": "${targetType}",
  "question": "the transformed question text",
  "options": [4 strings for mcq, ["True", "False"] for true_false, ["Yes", "No"] for yes_no, null for fitb],
  "answer": "the correct answer string (must match one of the options exactly for mcq/true_false/yes_no)",
  "explanation": "a short explanation of why the answer is correct",
  "sourceQuote": "the exact sourceQuote from the input question, preserved exactly"
}

Do not include any pre-text, post-text, or explanations outside the JSON array.`

  try {
    const rawContent = await callGroq([
      { role: 'system', content: prompt },
      { role: 'user', content: JSON.stringify(questionsList.map((q) => ({ id: q.id, text: q.question, answer: q.answer, sourceQuote: q.sourceQuote }))) },
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
