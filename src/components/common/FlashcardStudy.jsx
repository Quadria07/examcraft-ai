import React, { useState } from 'react'
import Icons from './Icons'

export default function FlashcardStudy({ questions, onExit }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  
  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  const [userAnswer, setUserAnswer] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setIsFlipped(false)
      setUserAnswer('')
      setIsCorrect(null)
      setTimeout(() => setCurrentIndex(currentIndex + 1), 150)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false)
      setUserAnswer('')
      setIsCorrect(null)
      setTimeout(() => setCurrentIndex(currentIndex - 1), 150)
    }
  }

  const handleFlip = () => {
    const flipped = !isFlipped
    setIsFlipped(flipped)
    
    if (flipped && userAnswer.trim()) {
      const normalizedUser = userAnswer.trim().toLowerCase()
      const normalizedCorrect = currentQuestion.answer.trim().toLowerCase()
      
      // If it's MCQ, the answer might be just 'A' or 'Option A'
      if (currentQuestion.type === 'mcq') {
        const letterOnly = normalizedCorrect.match(/[a-d]/i)?.[0]
        setIsCorrect(normalizedUser === normalizedCorrect || normalizedUser === letterOnly)
      } else {
        // For FITB/TrueFalse, allow simple inclusion or exact match
        setIsCorrect(normalizedUser === normalizedCorrect || normalizedCorrect.includes(normalizedUser))
      }
    }
  }

  // Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        // Only flip if not typing in input
        if (document.activeElement.tagName !== 'INPUT') {
          e.preventDefault()
          handleFlip()
        }
      } else if (e.code === 'ArrowRight') {
        handleNext()
      } else if (e.code === 'ArrowLeft') {
        handlePrev()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, isFlipped, userAnswer])

  return (
    <div className="fixed inset-0 z-[100] bg-[#faf6f0] flex flex-col items-center overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header Bar */}
      <header className="w-full max-w-7xl px-4 md:px-8 py-4 md:py-8 flex items-center justify-between relative z-10 shrink-0">
        <div className="flex items-center gap-3 md:gap-6">
          <button 
            onClick={onExit}
            className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white rounded-xl md:rounded-2xl border border-primary/5 shadow-sm hover:scale-110 active:scale-95 transition-all group"
          >
            <Icons.ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-warmGray-400 group-hover:text-primary transition-colors" />
          </button>
          <div className="hidden sm:block">
            <h2 className="text-[10px] md:text-sm font-black text-gray-900 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-0.5 md:mb-1">Active Recall</h2>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[8px] md:text-[10px] font-bold text-warmGray-400 uppercase tracking-widest">{questions.length} Concepts</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 md:gap-2">
          <span className="text-[8px] md:text-[10px] font-black text-primary uppercase tracking-widest">Progress</span>
          <div className="w-32 md:w-48 h-1 md:h-1.5 bg-white border border-primary/5 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-primary transition-all duration-700 shadow-[0_0_15px_rgba(74,124,89,0.3)]" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Study Area */}
      <main className="flex-1 w-full max-w-3xl px-4 flex flex-col justify-center relative z-10 overflow-y-auto custom-scrollbar pb-24 md:pb-32">
        <div className="w-full perspective-2000 py-4 md:py-8">
          <div 
            className={`relative w-full transition-all duration-1000 preserve-3d cursor-pointer grid grid-cols-1 grid-rows-1 ${isFlipped ? 'rotate-y-180' : ''}`}
            onClick={handleFlip}
          >
            
            {/* FRONT SIDE: THE BENTO CARD */}
            <div className="col-start-1 row-start-1 backface-hidden bg-white rounded-2xl md:rounded-3xl shadow-[0_20px_50px_-12px_rgba(74,124,89,0.08)] border border-primary/5 flex flex-col overflow-hidden">
              <div className="p-6 md:p-8 lg:p-10 flex flex-col lg:flex-row gap-6 md:gap-8 lg:gap-10 items-start">
                
                {/* Left: Question Area */}
                <div className="flex-1 space-y-4 md:space-y-5">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-primary/5 rounded-lg border border-primary/10">
                    <Icons.Award className="w-3 h-3 text-primary" />
                    <span className="text-[7px] md:text-[8px] font-black text-primary uppercase tracking-[0.2em]">
                      {currentQuestion.type === 'mcq' ? 'Multiple Choice' : ''}
                      {currentQuestion.type === 'tf' ? 'True / False' : ''}
                      {currentQuestion.type === 'yn' ? 'Yes / No' : ''}
                      {currentQuestion.type === 'fitb' ? 'Fill in the Blank' : ''}
                    </span>
                  </div>

                  <h3 className={`font-black text-gray-900 leading-[1.3] tracking-tight font-serif ${
                    currentQuestion.question.length > 150 ? 'text-lg md:text-xl' : 'text-xl md:text-2xl'
                  }`}>
                    {currentQuestion.question}
                  </h3>

                  <div className="flex items-center gap-3 text-warmGray-200">
                    <div className="h-px w-6 bg-warmGray-100" />
                    <span className="text-[8px] font-bold uppercase tracking-widest">Evaluate</span>
                  </div>
                </div>

                {/* Right: Interaction Area */}
                <div className="w-full lg:w-[280px] shrink-0 space-y-4 md:space-y-5">
                  {/* Options Display */}
                  {(currentQuestion.type === 'mcq' || currentQuestion.type === 'tf' || currentQuestion.type === 'yn') && (
                    <div className="space-y-2">
                      {currentQuestion.type === 'mcq' ? (
                        currentQuestion.options?.map((opt, i) => (
                          <div key={i} className="group/opt flex items-center gap-3 p-3 md:p-3.5 bg-cream/20 hover:bg-cream/40 border border-primary/5 rounded-xl transition-all">
                            <span className="w-6 h-6 md:w-7 md:h-7 shrink-0 flex items-center justify-center bg-white rounded-lg text-[8px] md:text-[9px] font-black text-primary border border-primary/5 group-hover/opt:scale-105 transition-transform">
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span className="text-[10px] md:text-[11px] font-bold text-warmGray-600 leading-tight">{opt}</span>
                          </div>
                        ))
                      ) : (
                        <div className="grid grid-cols-2 gap-2 md:gap-2.5">
                          {['True', 'False'].map((opt) => (
                            <div key={opt} className="flex flex-col items-center gap-2 p-4 md:p-5 bg-cream/20 border border-primary/5 rounded-xl hover:bg-cream/40 transition-all group/opt">
                              <div className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-white rounded-full text-primary shadow-sm group-hover/opt:scale-105 transition-transform">
                                {opt === 'True' ? <Icons.Check className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Icons.X className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                              </div>
                              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-primary">
                                {currentQuestion.type === 'yn' ? (opt === 'True' ? 'Yes' : 'No') : opt}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Input Focus Zone */}
                  <div className="relative group/input">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/5 to-transparent rounded-xl blur opacity-0 group-hover/input:opacity-100 transition-opacity" />
                    <div className="relative bg-white border border-primary/10 rounded-xl p-1 md:p-1.5 shadow-sm">
                      <input 
                        type="text"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Type response..."
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-3 md:px-4 py-2 md:py-2.5 text-[11px] md:text-xs font-bold text-center text-gray-900 bg-white focus:outline-none placeholder:text-warmGray-200 placeholder:font-black placeholder:uppercase placeholder:text-[7px] md:placeholder:text-[8px] placeholder:tracking-widest"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-6 md:px-8 lg:px-10 py-4 md:py-5 bg-cream/10 border-t border-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                   <div className="flex -space-x-1">
                      {[1,2,3].map(i => <div key={i} className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full border-2 border-white bg-primary/10" />)}
                   </div>
                   <span className="text-[7px] md:text-[8px] font-black text-warmGray-300 uppercase tracking-widest">Mastery</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-lg text-[7px] md:text-[8px] font-black text-primary uppercase tracking-widest border border-primary/5">
                   Space to Reveal
                </div>
              </div>
            </div>

            {/* BACK SIDE: THE MASTERED CARD */}
            <div className="col-start-1 row-start-1 backface-hidden rotate-y-180 bg-primary rounded-2xl md:rounded-3xl shadow-[0_20px_50px_-12px_rgba(74,124,89,0.15)] border-[4px] md:border-[6px] border-primary/10 flex flex-col overflow-hidden relative min-h-full">
              <div className="absolute top-0 right-0 p-8 md:p-12 opacity-5">
                <Icons.Award className="w-24 md:w-32 h-24 md:h-32 text-cream" />
              </div>
              
              <div className="p-6 md:p-8 lg:p-10 flex-1 flex flex-col items-center justify-center text-center relative z-10">
                {isCorrect !== null && (
                  <div className={`mb-4 md:mb-6 px-4 md:px-5 py-1.5 rounded-full text-[7px] md:text-[8px] font-black uppercase tracking-widest border-2 animate-bounce flex items-center gap-2 ${
                    isCorrect ? 'bg-cream/10 text-cream border-cream/20' : 'bg-red-500/20 text-red-100 border-red-500/30'
                  }`}>
                    {isCorrect ? <Icons.Check className="w-3 h-3" /> : <Icons.X className="w-3 h-3" />}
                    {isCorrect ? 'Accurate' : 'Review'}
                  </div>
                )}

                <div className="space-y-4 md:space-y-6 max-w-md">
                  <div>
                    <p className="text-[7px] md:text-[8px] font-black text-cream/40 uppercase tracking-[0.3em] mb-2 md:mb-3">Verified Concept</p>
                    <h3 className={`font-black text-cream leading-[1.3] tracking-tight font-serif ${
                      currentQuestion.answer.length > 100 ? 'text-lg md:text-xl' : 'text-2xl md:text-3xl'
                    }`}>
                      {currentQuestion.answer}
                    </h3>
                  </div>

                  {currentQuestion.explanation && (
                    <div className="bg-cream/5 backdrop-blur-md rounded-xl p-4 md:p-6 border border-cream/5">
                      <p className="text-xs md:text-sm font-medium text-cream/80 italic font-serif leading-relaxed">
                        "{currentQuestion.explanation}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 md:p-6 bg-white flex items-center justify-center relative z-10">
                 <div className="px-5 md:px-6 py-2 md:py-2.5 bg-primary text-cream rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest shadow-lg">
                   Mastered
                 </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Floating Control Dock */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-3 bg-white/90 backdrop-blur-xl px-5 py-3 rounded-2xl border border-primary/5 shadow-[0_15px_40px_-10px_rgba(74,124,89,0.15)]">
        <button 
          onClick={onExit}
          className="px-4 h-11 rounded-lg bg-red-500/5 text-red-500 flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all group border border-red-500/10"
        >
          <Icons.X className="w-4 h-4" />
          <span className="text-[8px] font-black uppercase tracking-widest hidden sm:block">Cancel</span>
        </button>

        <div className="w-px h-6 bg-primary/10 mx-1" />

        <button 
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          disabled={currentIndex === 0}
          className="w-11 h-11 rounded-lg bg-cream/50 text-primary flex items-center justify-center hover:bg-primary hover:text-white active:scale-95 transition-all disabled:opacity-20 shadow-sm group"
        >
          <Icons.ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <button 
          onClick={(e) => { e.stopPropagation(); handleFlip(); }}
          className="px-10 py-3.5 bg-primary text-cream rounded-lg font-black uppercase tracking-widest text-[8px] active:scale-95 transition-all shadow-md hover:translate-y-[-1px] border border-cream/10"
        >
          {isFlipped ? 'Question' : 'Verify'}
        </button>

        <button 
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          disabled={currentIndex === questions.length - 1}
          className="w-11 h-11 rounded-lg bg-cream/50 text-primary flex items-center justify-center hover:bg-primary hover:text-white active:scale-95 transition-all disabled:opacity-20 shadow-sm group"
        >
          <Icons.ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </footer>

      <style>{`
        .perspective-2000 { perspective: 2000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(74,124,89,0.1); border-radius: 10px; }
      `}</style>
    </div>
  )
}
