import * as api from '../utils/api'

export const useExamSession = () => {
  const saveExamSession = async (subjectId, unitIndex, responses, flagged, currentQuestionIndex, timerSeconds) => {
    const session = {
      subjectId,
      unitIndex,
      responses,
      flagged: Array.from(flagged),
      currentQuestionIndex,
      timerSeconds,
      timestamp: new Date().toISOString(),
    }

    try {
      await api.saveExamSession(session)
    } catch (error) {
      console.error('Failed to persist exam session:', error)
    }
  }

  const getExamSession = async () => {
    try {
      const response = await api.getExamSession()
      return response?.session || null
    } catch (error) {
      console.error('Failed to load exam session:', error)
      return null
    }
  }

  const clearExamSession = async () => {
    try {
      await api.clearExamSession()
    } catch (error) {
      console.error('Failed to clear exam session:', error)
    }
  }

  const hasActiveSession = async () => {
    const session = await getExamSession()
    return session !== null
  }

  return {
    saveExamSession,
    getExamSession,
    clearExamSession,
    hasActiveSession,
  }
}
