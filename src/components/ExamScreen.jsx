import React, { useState, useEffect } from 'react'
import Header from './Header'
import QuestionCard from './QuestionCard'
import Timer from './Timer'
import { shuffleArray, calculateScore, updateSubjectStats } from '../utils/data'
import { useExamSession } from '../hooks/useExamSession'
import Icons from './common/Icons'
import { v4 as uuidv4 } from 'uuid'

export default function ExamScreen({
  subjects,
  setSubjects,
  subjectId,
  unitIndex,
  onExamSubmit,
  onBackToDashboard,
  timerEnabled,
  timerDuration,
  examTimer,
  setExamTimer,
  passMarkPercent,
}) {
  const subject = subjects.find((s) => s.id === subjectId)
  const unit = subject?.units[unitIndex]
  const { saveExamSession, clearExamSession } = useExamSession()

  const [shuffledQuestions, setShuffledQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState({})
  const [flagged, setFlagged] = useState(new Set())
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredIndices, setFilteredIndices] = useState([])

  useEffect(() => {
    if (unit?.questions.length > 0) {
      setShuffledQuestions(shuffleArray(unit.questions))
    }
  }, [unit?.questions])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return // Don't trigger shortcuts when typing
      }

      if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'Escape') {
        setShowConfirmSubmit(true)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentQuestionIndex, shuffledQuestions.length])

  // Save exam progress periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (shuffledQuestions.length > 0) {
        saveExamSession(
          subjectId,
          unitIndex,
          responses,
          flagged,
          currentQuestionIndex,
          examTimer
        )
      }
    }, 10000) // Save every 10 seconds

    return () => clearInterval(interval)
  }, [responses, flagged, currentQuestionIndex, examTimer, shuffledQuestions.length, subjectId, unitIndex, saveExamSession])

  // Timer countdown
  useEffect(() => {
    if (!timerEnabled || examTimer === null) return

    if (examTimer <= 0) {
      handleSubmitExam()
      return
    }

    const interval = setInterval(() => {
      setExamTimer((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [timerEnabled, examTimer, setExamTimer])

  // Search/filter questions
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredIndices([])
      return
    }

    const query = searchQuery.toLowerCase()
    const indices = shuffledQuestions
      .map((q, idx) => ({
        idx,
        matches: q.question.toLowerCase().includes(query),
      }))
      .filter((item) => item.matches)
      .map((item) => item.idx)

    setFilteredIndices(indices)
  }, [searchQuery, shuffledQuestions])

  if (!unit || shuffledQuestions.length === 0) return null

  const currentQuestion = shuffledQuestions[currentQuestionIndex]
  const totalQuestions = shuffledQuestions.length
  const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'hard':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleAnswerChange = (answer) => {
    setResponses({
      ...responses,
      [currentQuestion.id]: answer,
    })
  }

  const handleFlag = () => {
    const newFlagged = new Set(flagged)
    if (newFlagged.has(currentQuestion.id)) {
      newFlagged.delete(currentQuestion.id)
    } else {
      newFlagged.add(currentQuestion.id)
    }
    setFlagged(newFlagged)
  }

  const handlePrevious = () => {
    if (filteredIndices.length > 0) {
      const currentFiltered = filteredIndices.indexOf(currentQuestionIndex)
      if (currentFiltered > 0) {
        setCurrentQuestionIndex(filteredIndices[currentFiltered - 1])
      }
    } else {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1)
      }
    }
  }

  const handleNext = () => {
    if (filteredIndices.length > 0) {
      const currentFiltered = filteredIndices.indexOf(currentQuestionIndex)
      if (currentFiltered < filteredIndices.length - 1) {
        setCurrentQuestionIndex(filteredIndices[currentFiltered + 1])
      }
    } else {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
      }
    }
  }

  const handleGoToQuestion = (index) => {
    setCurrentQuestionIndex(index)
  }

  const handleSubmitExam = () => {
    const scores = calculateScore(responses, shuffledQuestions)

    // Clear exam session
    clearExamSession()

    // Update Subject Stats (XP, Level, Streak)
    const isFirstTimePass = scores.percentage >= passMarkPercent && unit.bestScore < passMarkPercent
    
    let sessionXPGained = 0;
    const updatedSubjects = subjects.map((s) => {
      if (s.id === subjectId) {
        // 1. Update Unit Data
        const updatedUnits = [...s.units]
        const updatedUnit = { 
          ...updatedUnits[unitIndex],
          attempts: [...updatedUnits[unitIndex].attempts, {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            responses,
            flagged: Array.from(flagged),
            score: scores.correct,
            percentage: scores.percentage,
            completed: true,
            timeTaken: timerEnabled ? timerDuration * 60 - (examTimer || 0) : 0,
          }],
          bestScore: Math.max(updatedUnits[unitIndex].bestScore, scores.percentage),
          status: scores.percentage >= passMarkPercent ? 'passed' : 'failed'
        }

        // Unlock next unit if passed
        if (scores.percentage >= passMarkPercent && unitIndex + 1 < updatedUnits.length) {
          if (updatedUnits[unitIndex + 1].status === 'locked') {
            updatedUnits[unitIndex + 1].status = 'unlocked'
          }
        }

        updatedUnits[unitIndex] = updatedUnit
        
        // 2. Update subject with units AND stats
        const intermediateSubject = { ...s, units: updatedUnits }
        const { subject: finalSubject, xpGained } = updateSubjectStats(intermediateSubject, scores, unit.title, isFirstTimePass)
        sessionXPGained = xpGained;
        
        return finalSubject
      }
      return s
    })

    setSubjects(updatedSubjects)

    // Pass scores and XP gained to parent for results page
    onExamSubmit(scores, sessionXPGained)
  }

  const handleSaveAndExit = () => {
    // Session is already saved by the periodic save effect
    clearExamSession()
    onBackToDashboard()
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream text-gray-900">
      <Header title={`${subject.name} - ${unit.title}`} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {showConfirmSubmit && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl max-w-sm w-full p-10 border border-primary/10 animation-slide-up shadow-2xl">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Final Submission?</h3>
                <p className="text-sm text-warmGray-400 mt-2">
                  You have answered {Object.keys(responses).length} out of {totalQuestions} questions.
                  {flagged.size > 0 && ` ${flagged.size} questions are flagged for review.`}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSubmitExam}
                  className="w-full px-8 py-4 bg-primary text-cream rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-sm"
                >
                  Submit Assessment
                </button>
                <button
                  onClick={() => setShowConfirmSubmit(false)}
                  className="w-full px-8 py-4 bg-white text-primary border border-primary/30 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-cream transition-all active:scale-95"
                >
                  Continue Reviewing
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Main question area (9 columns) */}
          <div className="col-span-12 lg:col-span-9 flex flex-col gap-6">
            
            {/* 1. Header Block */}
            <div className="bg-white rounded-xl p-8 border border-primary/5">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </h2>
                  <div className="flex gap-2">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getDifficultyColor(currentQuestion.difficulty)}`}>
                      {currentQuestion.difficulty}
                    </span>
                    <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-tertiary/5 text-tertiary border border-tertiary/10">
                      {currentQuestion.bloomLevel}
                    </span>
                  </div>
                </div>

                {timerEnabled && (
                  <div className="bg-primary/5 px-6 py-3 rounded-xl border border-primary/10">
                    <Timer seconds={examTimer} isRunning={true} />
                  </div>
                )}
              </div>

              <div className="w-full bg-cream h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* 2. Question Content */}
            <div className="bg-white rounded-xl p-2 border border-primary/5 min-h-[400px]">
              <QuestionCard
                question={currentQuestion}
                answer={responses[currentQuestion.id]}
                onAnswerChange={handleAnswerChange}
                isFlagged={flagged.has(currentQuestion.id)}
                onFlag={handleFlag}
              />
            </div>
          </div>

          {/* SIDEBAR: Palette & Info (3 columns) */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
            
            <div className="bg-white rounded-xl border border-primary/5 p-8 sticky top-24 max-h-[calc(100vh-150px)] overflow-y-auto custom-scrollbar">
              {/* Question Navigation Palette */}
              <div className="mb-8">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-warmGray-400 mb-6">Question Palette</h4>
                
                <div className="relative mb-6">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Icons.Search className="w-4 h-4 text-warmGray-300" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-xs bg-cream border border-primary/10 rounded-lg focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
                  />
                </div>

                <div className="grid grid-cols-5 gap-2.5">
                  {shuffledQuestions.map((q, index) => {
                    if (searchQuery && !filteredIndices.includes(index)) return null

                    const isAnswered = !!responses[q.id]
                    const isFlagged = flagged.has(q.id)
                    const isCurrent = index === currentQuestionIndex

                    let btnStyle = 'bg-cream text-warmGray-400 border-primary/5'
                    if (isAnswered) btnStyle = 'bg-primary/10 text-primary border-primary/20'
                    if (isFlagged) btnStyle = 'bg-tertiary/10 text-tertiary border-tertiary/20'
                    if (isCurrent) btnStyle = 'bg-primary text-cream border-primary shadow-sm scale-110 z-10'

                    return (
                      <button
                        key={q.id}
                        onClick={() => handleGoToQuestion(index)}
                        className={`h-9 rounded-lg text-[10px] font-black transition-all active:scale-95 border ${btnStyle}`}
                      >
                        {index + 1}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Action Controls Moved to Sidebar */}
              <div className="pt-8 border-t border-primary/5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center justify-center gap-2 py-4 bg-cream disabled:opacity-40 text-primary rounded-xl font-black uppercase tracking-widest text-[9px] transition-all border border-primary/10 active:scale-95"
                  >
                    <Icons.ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={currentQuestionIndex === totalQuestions - 1}
                    className="flex items-center justify-center gap-2 py-4 bg-primary disabled:opacity-40 text-cream rounded-xl font-black uppercase tracking-widest text-[9px] transition-all active:scale-95 shadow-sm"
                  >
                    Next
                    <Icons.ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setShowConfirmSubmit(true)}
                  className="w-full py-5 bg-primary text-cream rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-[0_10px_20px_rgba(74,124,89,0.2)] border-2 border-cream/10"
                >
                  Submit Assessment
                </button>

                <button
                  onClick={handleSaveAndExit}
                  className="w-full py-4 bg-white text-tertiary border border-tertiary/20 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-tertiary/5 transition-all active:scale-95"
                >
                  Save & Exit
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-primary/5 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-warmGray-400 mb-1">Legend</p>
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-[9px] font-black uppercase text-warmGray-500 tracking-wider">Answered</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-tertiary" />
                  <span className="text-[9px] font-black uppercase text-warmGray-500 tracking-wider">Flagged</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
