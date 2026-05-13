import { useState, useEffect } from 'react'

const EXAM_SESSION_KEY = 'activeExamSession'

export const useExamSession = () => {
  const saveExamSession = (subjectId, unitIndex, responses, flagged, currentQuestionIndex, timerSeconds) => {
    const session = {
      subjectId,
      unitIndex,
      responses,
      flagged: Array.from(flagged),
      currentQuestionIndex,
      timerSeconds,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem(EXAM_SESSION_KEY, JSON.stringify(session))
  }

  const getExamSession = () => {
    const session = localStorage.getItem(EXAM_SESSION_KEY)
    return session ? JSON.parse(session) : null
  }

  const clearExamSession = () => {
    localStorage.removeItem(EXAM_SESSION_KEY)
  }

  const hasActiveSession = () => {
    return localStorage.getItem(EXAM_SESSION_KEY) !== null
  }

  return {
    saveExamSession,
    getExamSession,
    clearExamSession,
    hasActiveSession,
  }
}
