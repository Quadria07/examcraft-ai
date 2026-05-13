import React from 'react'
import Icons from './common/Icons'

export default function QuestionCard({
  question,
  answer,
  onAnswerChange,
  isFlagged,
  onFlag,
}) {
  return (
    <div className="bg-white rounded-[2rem] overflow-hidden flex flex-col h-full">
      <div className="p-8 lg:p-10 flex flex-col lg:flex-row gap-8 lg:gap-12 items-start h-full">
        
        {/* Left Section: Question Content */}
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-3 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10">
            <Icons.Search className="w-3.5 h-3.5 text-primary" />
            <span className="text-[9px] font-black text-primary uppercase tracking-widest">
              {question.type === 'mcq' ? 'Inquiry Selection' : ''}
              {question.type === 'tf' || question.type === 'true_false' ? 'True / False Analysis' : ''}
              {question.type === 'yn' || question.type === 'yes_no' ? 'Yes / No Analysis' : ''}
              {question.type === 'fitb' ? 'Text Synthesis' : ''}
            </span>
          </div>

          <h3 className={`font-black text-gray-900 leading-[1.3] tracking-tight font-serif ${
            question.question.length > 200 ? 'text-xl' : 'text-2xl'
          }`}>
            {question.question}
          </h3>

          <div className="flex flex-col gap-4">
             <div className="flex items-center gap-3 text-warmGray-200">
                <div className="h-px w-8 bg-warmGray-100" />
                <span className="text-[9px] font-bold uppercase tracking-widest italic">Review Thoroughly</span>
             </div>

             <button
                onClick={onFlag}
                className={`w-fit flex items-center gap-3 px-5 py-2.5 rounded-lg font-black uppercase tracking-widest text-[9px] transition-all active:scale-95 border ${
                  isFlagged
                    ? 'bg-tertiary text-cream border-tertiary shadow-sm'
                    : 'bg-white text-warmGray-300 border-primary/10 hover:bg-cream hover:text-primary'
                }`}
              >
                <Icons.Flag className="w-3.5 h-3.5" />
                {isFlagged ? 'Review Requested' : 'Flag Question'}
              </button>
          </div>
        </div>

        {/* Right Section: Interaction/Response */}
        <div className="w-full lg:w-[350px] shrink-0 space-y-6">
          
          {/* MCQ Options */}
          {(question.type === 'mcq') && (
            <div className="space-y-2.5">
              {question.options.map((option, index) => {
                const isSelected = answer === option
                const label = String.fromCharCode(65 + index)
                return (
                  <label
                    key={index}
                    className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all group relative overflow-hidden ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-cream bg-cream/30 hover:border-primary/20'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${
                      isSelected ? 'bg-primary text-cream' : 'bg-white text-warmGray-400 border border-primary/5'
                    }`}>
                      {label}
                    </div>
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option}
                      checked={isSelected}
                      onChange={(e) => onAnswerChange(e.target.value)}
                      className="hidden"
                    />
                    <span className={`text-[13px] leading-tight transition-colors ${
                      isSelected ? 'text-gray-900 font-black' : 'text-warmGray-600 font-bold'
                    }`}>
                      {option}
                    </span>
                  </label>
                )
              })}
            </div>
          )}

          {/* True/False & Yes/No */}
          {(question.type === 'true_false' || question.type === 'yes_no') && (
            <div className="grid grid-cols-2 gap-4">
              {(question.type === 'true_false' ? ['True', 'False'] : ['Yes', 'No']).map((option) => {
                const isSelected = answer === option
                return (
                  <button
                    key={option}
                    onClick={() => onAnswerChange(option)}
                    className={`flex flex-col items-center justify-center p-8 border-2 rounded-xl transition-all gap-4 group ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-cream bg-cream/30 hover:border-primary/20'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isSelected ? 'bg-primary scale-105 shadow-md' : 'bg-white border border-primary/5'
                    }`}>
                      {option === 'True' || option === 'Yes' ? (
                        <Icons.Check className={`w-6 h-6 ${isSelected ? 'text-cream' : 'text-warmGray-200'}`} />
                      ) : (
                        <Icons.X className={`w-6 h-6 ${isSelected ? 'text-cream' : 'text-warmGray-200'}`} />
                      )}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                      isSelected ? 'text-gray-900' : 'text-warmGray-400'
                    }`}>
                      {option}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Fill in the Blank */}
          {question.type === 'fitb' && (
            <div className="space-y-4">
              <div className="relative group">
                <input
                  type="text"
                  value={answer || ''}
                  onChange={(e) => onAnswerChange(e.target.value)}
                  placeholder="Input response..."
                  className="w-full px-6 py-8 bg-cream/30 border-2 border-primary/5 rounded-xl font-bold text-xl focus:outline-none focus:border-primary transition-all placeholder:text-warmGray-200 text-gray-900 font-serif text-center"
                />
              </div>
              <div className="p-4 bg-tertiary/5 rounded-lg border border-tertiary/10">
                <p className="text-[8px] font-black text-warmGray-400 leading-relaxed uppercase tracking-widest text-center">
                  Spelling must be exact.
                </p>
              </div>
            </div>
          )}

          {/* Response Status */}
          {answer && (
            <div className="flex items-center justify-center gap-2.5 py-3 bg-primary/5 rounded-lg border border-primary/10 animate-fade-in">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Icons.Check className="w-3 h-3 text-cream" />
              </div>
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">Recorded</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
