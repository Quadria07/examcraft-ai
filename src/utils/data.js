import { v4 as uuidv4 } from 'uuid'

// Data Management Utilities
export const createSubject = (name) => ({
  id: uuidv4(),
  name,
  units: [],
  stats: {
    xp: 0,
    level: 1,
    streak: 0,
    lastActivityDate: null,
    totalQuestionsSolved: 0,
    badges: [],
    history: [], // { date: string, score: number, subject: string }
  }
})

export const createUnit = (title) => ({
  id: uuidv4(),
  title,
  material: '',
  questions: [],
  attempts: [],
  status: 'locked', // locked | unlocked | passed | failed
  bestScore: 0,
})

export const createQuestion = (data) => ({
  id: uuidv4(),
  type: data.type, // mcq | fitb | true_false | yes_no
  question: data.question,
  options: data.options || null, // only for MCQ
  answer: data.answer,
  difficulty: data.difficulty || 'medium', // easy | medium | hard
  bloomLevel: data.bloomLevel || 'knowledge',
  explanation: data.explanation || null, // placeholder for tutor
})

export const createAttempt = (difficulty = 'medium') => ({
  id: uuidv4(),
  timestamp: new Date().toISOString(),
  responses: {}, // questionId -> userAnswer
  flagged: new Set(), // questionId set
  score: 0,
  percentage: 0,
  completed: false,
  timeTaken: 0,
  difficulty, // The difficulty setting used for this attempt
})

// Answer Evaluation
const normalizeAnswer = (answer) => {
  if (typeof answer !== 'string') return ''
  return answer.trim().toLowerCase()
}

export const evaluateAnswer = (userAnswer, correctAnswer, questionType, options = []) => {
  const normalizedUser = normalizeAnswer(userAnswer)
  const normalizedCorrect = normalizeAnswer(correctAnswer)

  if (questionType === 'mcq' && options && options.length > 0) {
    // 1. Check if both are labels (e.g. "a" === "a")
    if (normalizedUser.length === 1 && normalizedCorrect.length === 1) {
      return normalizedUser === normalizedCorrect
    }

    // 2. Check if user provided text matches correct text
    if (normalizedUser === normalizedCorrect) return true

    // 3. Check if user provided text matches the text of the correct label
    const correctIdx = normalizedCorrect.length === 1 ? normalizedCorrect.charCodeAt(0) - 97 : -1
    if (correctIdx >= 0 && correctIdx < options.length) {
      if (normalizeAnswer(options[correctIdx]) === normalizedUser) return true
    }

    // 4. Check if user provided label matches the text of the correct answer
    const userIdx = normalizedUser.length === 1 ? normalizedUser.charCodeAt(0) - 97 : -1
    if (userIdx >= 0 && userIdx < options.length) {
      if (normalizeAnswer(options[userIdx]) === normalizedCorrect) return true
    }
  }

  // Fallback for all types
  return normalizedUser === normalizedCorrect
}

// Gamification & Analytics Logic
export const calculateLevel = (xp) => Math.floor(xp / 500) + 1

/**
 * Updates subject stats based on an attempt.
 * Returns { updatedSubject, xpGained }
 */
export const updateSubjectStats = (subject, attempt, unitTitle, isFirstTimePass) => {
  const stats = subject.stats || {
    xp: 0,
    level: 1,
    streak: 0,
    lastActivityDate: null,
    totalQuestionsSolved: 0,
    badges: [],
    history: []
  }

  let xpGained = 0
  xpGained += attempt.score * 10 // 10 XP per correct answer
  xpGained += 50 // 50 XP for completing a unit
  if (isFirstTimePass) {
    xpGained += 150 // 150 XP bonus for passing first time
  }

  const newXP = stats.xp + xpGained
  const newLevel = calculateLevel(newXP)
  
  // Streak logic
  const today = new Date().toISOString().split('T')[0]
  const lastDate = stats.lastActivityDate ? stats.lastActivityDate.split('T')[0] : null
  let newStreak = stats.streak

  if (!lastDate) {
    newStreak = 1
  } else if (lastDate === today) {
    // Already active today, streak remains
  } else {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    if (lastDate === yesterdayStr) {
      newStreak += 1
    } else {
      newStreak = 1
    }
  }

  // History for charts
  const historyEntry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    score: attempt.percentage,
    unitTitle,
  }

  // Badges
  const newBadges = [...stats.badges]
  if (newStreak >= 3 && !newBadges.includes('streak_3')) newBadges.push('streak_3')
  if (newLevel >= 5 && !newBadges.includes('level_5')) newBadges.push('level_5')
  if (attempt.percentage === 100 && !newBadges.includes('perfect_score')) newBadges.push('perfect_score')

  return {
    subject: {
      ...subject,
      stats: {
        ...stats,
        xp: newXP,
        level: newLevel,
        streak: newStreak,
        lastActivityDate: new Date().toISOString(),
        totalQuestionsSolved: stats.totalQuestionsSolved + attempt.score,
        badges: newBadges,
        history: [...stats.history, historyEntry].slice(-50), // Keep last 50 for performance
      }
    },
    xpGained
  }
}

export const calculateScore = (responses, questions) => {
  let correct = 0
  let total = questions.length

  questions.forEach((question) => {
    const userAnswer = responses[question.id]
    if (userAnswer && evaluateAnswer(userAnswer, question.answer, question.type, question.options)) {
      correct++
    }
  })

  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0
  return { correct, total, percentage }
}

// Groq API Integration
export const generateQuestionsFromMaterial = async (material, groqApiKey, config) => {
  if (!groqApiKey) {
    throw new Error('Groq API key is not configured')
  }

  const {
    mcqCount = 10,
    fitbCount = 5,
    tfCount = 3,
    ynCount = 2,
    difficulty = 'medium'
  } = config || {}

  const totalRequested = mcqCount + fitbCount + tfCount + ynCount

  const systemPrompt = `You are a university lecturer with a PhD setting examination questions for undergraduate students at the National Open University of Nigeria (NOUN). Your questions must:

1. Be derived STRICTLY and ONLY from the provided course material.
2. Reflect university-level academic rigor.
3. Difficulty Level: ${difficulty === 'mixed' ? 'A diverse MIX of EASY, MEDIUM, and HARD questions' : difficulty.toUpperCase()}.
4. Question Format Requirements:
   - MCQ: 4 options, 1 correct.
   - FITB (Fill-in-the-Gap): Exact single-term or short-phrase extracted directly from text.
   - TRUE_FALSE: Question with "True" or "False" as answer.
   - YES_NO: Question with "Yes" or "No" as answer.
5. NOUN Convention: Some MCQ questions may repeat as FITB or T/F to test recognition memory.
6. Provide Bloom's Taxonomy level for each.

Return ONLY a valid JSON array of objects:
{
  "type": "mcq" | "fitb" | "true_false" | "yes_no",
  "question": "...",
  "options": ["A", "B", "C", "D"] (only for mcq),
  "answer": "...",
  "difficulty": "${difficulty}",
  "bloomLevel": "..."
}

Generate exactly ${totalRequested} questions distributed as follows:
- ${mcqCount} Multiple Choice (MCQ)
- ${fitbCount} Fill-in-the-Gap (FITB)
- ${tfCount} True/False (TRUE_FALSE)
- ${ynCount} Yes/No (YES_NO)

If the material is insufficient, generate as many as possible following these ratios.`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate exam questions from this material:\n\n${material}` },
        ],
        temperature: 0.3,
        max_tokens: 6000,
      }),
    })

    if (!response.ok) {
       const errorData = await response.json()
       throw new Error(errorData.error?.message || 'Failed to generate questions')
    }

    const data = await response.json()
    const rawContent = data.choices[0].message.content
    let content = rawContent
    const jsonStart = content.indexOf('[')
    const jsonEnd = content.lastIndexOf(']')

    if (jsonStart !== -1 && jsonEnd !== -1) {
      content = content.substring(jsonStart, jsonEnd + 1)
    }

    const questions = JSON.parse(content)
    return questions.map(createQuestion).slice(0, totalRequested)
  } catch (error) {
    throw error
  }
}

export const getQuestionExplanation = async (question, material, groqApiKey) => {
  const prompt = `As an expert academic tutor, explain the answer to this question based on the material provided.
Focus on teaching the core concept. Keep the explanation concise (2-3 sentences max).

MATERIAL:
${material.substring(0, 3000)} ...

QUESTION:
${question.question}

CORRECT ANSWER:
${question.answer}

EXPLANATION:`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a helpful academic tutor. Provide clear, concise explanations.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 500,
      }),
    })

    const data = await response.json()
    return data.choices[0].message.content.trim()
  } catch (error) {
    return 'Could not retrieve explanation at this time.'
  }
}

// Unit Progression Logic
export const getNextUnlockedUnit = (subjects, currentSubjectId, currentUnitIndex) => {
  const subject = subjects.find((s) => s.id === currentSubjectId)
  if (!subject) return null

  const currentUnit = subject.units[currentUnitIndex]
  if (!currentUnit) return null

  // If current unit is passed, unlock next unit
  if (currentUnit.status === 'passed' && currentUnitIndex + 1 < subject.units.length) {
    return subject.units[currentUnitIndex + 1]
  }

  return null
}

export const unlockNextUnit = (subjects, currentSubjectId, currentUnitIndex) => {
  const updatedSubjects = subjects.map((subject) => {
    if (subject.id === currentSubjectId) {
      const updatedUnits = [...subject.units]
      if (currentUnitIndex + 1 < updatedUnits.length) {
        updatedUnits[currentUnitIndex + 1] = {
          ...updatedUnits[currentUnitIndex + 1],
          status: 'unlocked',
        }
      }
      return { ...subject, units: updatedUnits }
    }
    return subject
  })

  return updatedSubjects
}

// Shuffle array for question order
export const shuffleArray = (array) => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Format time
export const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  return `${minutes}m ${secs}s`
}

export const proposeUnitsFromMaterial = async (content, groqApiKey) => {
  if (!groqApiKey) {
    throw new Error('Groq API key is not configured')
  }

  const wordCount = content.trim().split(/\s+/).length
  if (wordCount < 200) {
    throw new Error('Content is too short to be divided into units.')
  }

  const systemPrompt = `You are an expert curriculum designer. Your task is to analyze a large body of course material and divide it into logical "Units" or "Modules".

For the provided text:
1. Identify logical thematic breaks.
2. For each Unit, provide a clear, academic Title.
3. For each Unit, provide a concise summary or the core content that belongs in that unit.
4. Aim for units of roughly 500-2000 words each, but prioritize thematic consistency.

Return ONLY a valid JSON array of objects:
[
  {
    "title": "Unit Title",
    "material": "Full text or detailed content for this unit"
  }
]

Do not include any preamble or extra text. Only the JSON array.`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze and divide this course material into logical units:\n\n${content.substring(0, 20000)}` },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    })

    if (!response.ok) {
       const errorData = await response.json()
       throw new Error(errorData.error?.message || 'Failed to analyze material')
    }

    const data = await response.json()
    const rawContent = data.choices[0].message.content
    let jsonString = rawContent
    const jsonStart = jsonString.indexOf('[')
    const jsonEnd = jsonString.lastIndexOf(']')

    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonString = jsonString.substring(jsonStart, jsonEnd + 1)
    }

    const units = JSON.parse(jsonString)
    return units.map((u, index) => ({
      ...u,
      id: uuidv4(),
      questions: [],
      attempts: [],
      status: index === 0 ? 'unlocked' : 'locked',
      bestScore: 0
    }))
  } catch (error) {
    console.error('Smart Chunking Error:', error)
    if (error.name === 'SyntaxError') {
      throw new Error('AI response was too large and got truncated. Try uploading a smaller portion of the document.')
    }
    throw new Error('Failed to divide material into units. Please try a smaller file or manual pasting.')
  }
}
