const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const request = async (method, path, body, auth = true) => {
  const headers = {
    'Content-Type': 'application/json',
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch (error) {
    throw new Error('Invalid JSON response from server')
  }

  if (!response.ok) {
    const message = data?.message || response.statusText
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return data
}

export { request }

export const register = async (email, password, inviteCode) => {
  return request('POST', '/api/auth/register', { email, password, inviteCode }, false)
}

export const login = async (email, password) => {
  return request('POST', '/api/auth/login', { email, password }, false)
}

export const logout = async () => {
  return request('POST', '/api/auth/logout', undefined, true)
}

export const getCurrentUser = async () => {
  return request('GET', '/api/auth/me', undefined, true)
}

export const fetchAppData = async () => {
  return request('GET', '/api/data', undefined, true)
}

export const saveAppData = async (payload) => {
  return request('PUT', '/api/data', payload, true)
}

export const generateQuestionsFromMaterial = async (material, config) => {
  return request('POST', '/api/groq/questions', { material, config }, true)
}

export const getQuestionExplanation = async (question, material) => {
  return request('POST', '/api/groq/explain', { question, material }, true)
}

export const proposeUnitsFromMaterial = async (content) => {
  return request('POST', '/api/groq/units', { content }, true)
}

export const transformQuestions = async (questionsList, targetType) => {
  return request('POST', '/api/groq/transform', { questionsList, targetType }, true)
}

export const extractPracticeQuestions = async (importText) => {
  return request('POST', '/api/groq/practice/extract', { importText }, true)
}

export const validatePracticeQuestions = async (importText, questions) => {
  return request('POST', '/api/groq/practice/validate', { importText, questions }, true)
}

export const getExamSession = async () => {
  return request('GET', '/api/session', undefined, true)
}

export const saveExamSession = async (session) => {
  return request('PUT', '/api/session', { session }, true)
}

export const clearExamSession = async () => {
  return request('DELETE', '/api/session', undefined, true)
}

export const wipeAllData = async () => {
  return request('DELETE', '/api/data', undefined, true)
}
