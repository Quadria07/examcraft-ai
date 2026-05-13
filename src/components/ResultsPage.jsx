import React, { useState, useEffect } from 'react'
import Header from './Header'
import { evaluateAnswer, getQuestionExplanation } from '../utils/data'
import Icons from './common/Icons'
import confetti from 'canvas-confetti'
import FlashcardStudy from './common/FlashcardStudy'

export default function ResultsPage({
  subjects,
  setSubjects,
  subjectId,
  unitIndex,
  onBackToDashboard,
  onRetryUnit,
  xpGained,
  passMarkPercent,
}) {
  const subject = subjects.find((s) => s.id === subjectId)
  const unit = subject?.units[unitIndex]
  const currentAttempt = unit?.attempts[unit.attempts.length - 1]
  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY

  if (!currentAttempt || !unit) return null

  const [showReviewPanel, setShowReviewPanel] = useState(false)
  const [showFlashcards, setShowFlashcards] = useState(false)
  const [explanations, setExplanations] = useState({}) // questionId -> text
  const [explainingId, setExplainingId] = useState(null) // current questionId being explained
  const isPassed = currentAttempt.percentage >= passMarkPercent

  useEffect(() => {
    if (isPassed) {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#2e7d32', '#d4a017', '#f5f5dc'] // Terra colors
      })
    }
  }, [isPassed])

  const filteredQuestions = unit.questions.filter((q) =>
    currentAttempt.responses.hasOwnProperty(q.id)
  )

  const bloomBreakdown = {
    easy: { total: 0, correct: 0 },
    medium: { total: 0, correct: 0 },
    hard: { total: 0, correct: 0 },
  }

  unit.questions.forEach((q) => {
    const level = q.difficulty
    bloomBreakdown[level].total++
    if (currentAttempt.responses[q.id] && 
        evaluateAnswer(currentAttempt.responses[q.id], q.answer, q.type)) {
      bloomBreakdown[level].correct++
    }
  })

  const handleProceedToNextUnit = () => {
    onBackToDashboard()
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream text-gray-900">
      <Header title={`Assessment Results - ${unit.title}`} />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        
        <div className="grid grid-cols-12 gap-6 items-start">
          
          {/* LEFT SECTION (8 columns) */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            
            {/* 1. SCORE DISPLAY BLOCK */}
            <div className={`bg-white rounded-xl p-12 border ${isPassed ? 'border-primary/20' : 'border-red-100'} shadow-sm relative overflow-hidden text-center flex flex-col items-center justify-center min-h-[400px]`}>
              {/* Background Accent */}
              <div className={`absolute top-0 inset-x-0 h-2 ${isPassed ? 'bg-primary' : 'bg-red-500'}`} />
              
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner ${isPassed ? 'bg-primary/10 text-primary' : 'bg-red-50 text-red-500'}`}>
                {isPassed ? <Icons.Award className="w-10 h-10" /> : <Icons.X className="w-10 h-10" />}
              </div>

              <div className="mb-4">
                <span className={`text-7xl font-black tracking-tighter ${isPassed ? 'text-primary' : 'text-red-600'}`}>
                  {currentAttempt.percentage}%
                </span>
              </div>

              <div className="mb-8">
                <p className={`text-2xl font-black uppercase tracking-widest ${isPassed ? 'text-primary' : 'text-red-600'}`}>
                  {isPassed ? 'Assessment Mastered' : 'Mastery Incomplete'}
                </p>
                <p className="text-sm text-warmGray-400 font-medium mt-1">
                  Correct Response: {currentAttempt.score} / {unit.questions.length}
                </p>
              </div>

              {xpGained > 0 && (
                <div className="mb-10 px-6 py-2 bg-primary/5 border border-primary/10 text-primary rounded-full font-black text-xs flex items-center gap-2 animate-bounce">
                  <Icons.Award className="w-4 h-4" />
                  +{xpGained} XP GAINED
                </div>
              )}

              <div className="px-4 py-1.5 bg-cream rounded-full border border-primary/5 text-[10px] font-black uppercase tracking-widest text-warmGray-400">
                Course Threshold: {passMarkPercent}%
              </div>
            </div>

            {/* 2. QUESTION REVIEW BLOCK */}
            <div className="bg-white rounded-xl border border-primary/5 overflow-hidden">
              <button
                onClick={() => setShowReviewPanel(!showReviewPanel)}
                className="w-full flex items-center justify-between px-8 py-6 hover:bg-cream transition-colors border-b border-primary/5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-cream rounded-lg flex items-center justify-center text-primary">
                    <Icons.Clipboard className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Detailed Review</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-warmGray-400">Analyze individual responses</p>
                  </div>
                </div>
                <div className={`transition-transform duration-300 ${showReviewPanel ? 'rotate-180' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-warmGray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </button>

              {showReviewPanel && (
                <div className="divide-y divide-primary/5">
                  {unit.questions.map((question, index) => {
                    const userAnswer = currentAttempt.responses[question.id]
                    const isCorrect = userAnswer && evaluateAnswer(userAnswer, question.answer, question.type, question.options)
                    const isUnanswered = !userAnswer

                    return (
                      <div key={question.id} className="p-8 hover:bg-cream/50 transition-all">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-black text-warmGray-300">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${
                              isCorrect ? 'bg-primary/5 text-primary border-primary/10' :
                              isUnanswered ? 'bg-warmGray-50 text-warmGray-400 border-warmGray-100' :
                              'bg-red-50 text-red-500 border-red-100'
                            }`}>
                              {isCorrect ? <Icons.Check className="w-3.5 h-3.5" /> : isUnanswered ? <Icons.Circle className="w-3.5 h-3.5" /> : <Icons.X className="w-3.5 h-3.5" />}
                              {isCorrect ? 'Accurate' : isUnanswered ? 'Skipped' : 'Inaccurate'}
                            </span>
                          </div>

                          <button
                            onClick={async () => {
                              if (explanations[question.id]) return
                              setExplainingId(question.id)
                              try {
                                const explanation = await getQuestionExplanation(question, unit.material, groqApiKey)
                                setExplanations(prev => ({ ...prev, [question.id]: explanation }))
                              } catch (err) { console.error(err) } finally { setExplainingId(null) }
                            }}
                            disabled={explainingId === question.id}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 border ${
                              explanations[question.id] 
                                ? 'bg-primary text-cream border-primary' 
                                : 'bg-primary/5 hover:bg-primary/10 text-primary border-primary/10'
                            }`}
                          >
                            {explainingId === question.id ? 'Analyzing...' : explanations[question.id] ? 'Insight Ready' : 'Request Insight'}
                          </button>
                        </div>

                        <p className="text-gray-900 font-bold mb-6 leading-relaxed px-2 border-l-4 border-primary/10 ml-2">
                          {question.question}
                        </p>

                        {/* Explanation / Insight Display */}
                        {explanations[question.id] && (
                          <div className="mb-8 p-6 bg-amber-50/50 border border-amber-100 rounded-xl animation-fade-in">
                            <div className="flex items-center gap-2 mb-3">
                              <Icons.Award className="w-4 h-4 text-amber-600" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Academic Insight</span>
                            </div>
                            <p className="text-sm text-amber-900/80 leading-relaxed font-medium">
                              {explanations[question.id]}
                            </p>
                          </div>
                        )}

                        <div className="grid sm:grid-cols-2 gap-8 px-2">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-warmGray-400">Student Submission</p>
                            <p className={`text-sm font-bold p-4 rounded-xl border ${isCorrect ? 'bg-primary/5 text-primary border-primary/10' : 'bg-red-50 text-red-500 border-red-100'}`}>
                              {(() => {
                                if (question.type !== 'mcq' || !userAnswer) return userAnswer || '(No entry found)';
                                // Check if user answer is a label or text
                                if (userAnswer.length === 1) return userAnswer.toUpperCase();
                                const idx = question.options.findIndex(opt => opt.trim().toLowerCase() === userAnswer.trim().toLowerCase());
                                return idx !== -1 ? String.fromCharCode(65 + idx) : userAnswer;
                              })()}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-warmGray-400">Correct Response</p>
                            <div className="p-4 rounded-xl border bg-primary/5 border-primary/10 flex flex-col gap-1">
                               <span className="text-[8px] font-black text-primary uppercase tracking-widest">Standard:</span>
                               <p className="text-sm font-bold text-primary">
                                 {(() => {
                                   if (question.type !== 'mcq') return question.answer;
                                   // If answer is a label, find the text. If text, find label.
                                   if (question.answer.length === 1) {
                                     const idx = question.answer.toUpperCase().charCodeAt(0) - 65;
                                     return `${question.answer.toUpperCase()} - ${question.options[idx] || ''}`;
                                   }
                                   const idx = question.options.findIndex(opt => opt.trim().toLowerCase() === question.answer.trim().toLowerCase());
                                   return idx !== -1 ? `${String.fromCharCode(65 + idx)} - ${question.answer}` : question.answer;
                                 })()}
                               </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SECTION (4 columns) */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 sticky top-24">
            
            {/* 4. ACTIONS BLOCK */}
            <div className="bg-primary/5 rounded-xl p-8 border border-primary/10 flex flex-col gap-4">
              <h3 className="text-primary font-black uppercase tracking-widest text-xs mb-4">Academic Progression</h3>
              
              {!isPassed && (
                <button
                  onClick={onRetryUnit}
                  className="w-full px-8 py-4 bg-primary text-cream rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-sm"
                >
                  Retry This Module
                </button>
              )}

              <button
                onClick={() => setShowFlashcards(true)}
                className="w-full px-8 py-4 bg-white text-tertiary border border-tertiary/30 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-cream transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Icons.Award className="w-4 h-4" />
                Flashcard Practice
              </button>

              {isPassed && unitIndex + 1 < subject.units.length && (
                <button
                  onClick={handleProceedToNextUnit}
                  className="w-full px-8 py-4 bg-primary text-cream rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-sm"
                >
                  Next Curriculum Unit
                </button>
              )}

              <button
                onClick={onBackToDashboard}
                className="w-full px-8 py-4 bg-white text-primary border border-primary/30 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-cream transition-all active:scale-95"
              >
                Return to Dashboard
              </button>
              
              <p className="mt-4 text-[10px] font-medium text-warmGray-400 italic text-center font-serif leading-relaxed">
                "Reflection is the mother of wisdom." <br/> Review your inaccuracies to strengthen your mastery.
              </p>
            </div>

            {showFlashcards && (
              <FlashcardStudy 
                questions={unit.questions} 
                onExit={() => setShowFlashcards(false)} 
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
