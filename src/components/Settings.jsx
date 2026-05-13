import React, { useState } from 'react'
import Header from './Header'
import Icons from './common/Icons'

export default function Settings({
  passMarkPercent,
  onPassMarkChange,
  subjects,
  onClearAllData,
  onBackToDashboard,
}) {
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const totalQuestions = subjects.reduce((acc, subject) =>
    acc + subject.units.reduce((unitAcc, unit) => unitAcc + unit.questions.length, 0), 0
  )

  const totalAttempts = subjects.reduce((acc, subject) =>
    acc + subject.units.reduce((unitAcc, unit) => unitAcc + unit.attempts.length, 0), 0
  )

  return (
    <div className="min-h-screen bg-cream text-gray-900">
      <Header
        title="Settings"
        onSettings={null}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Back Button */}
        <button
          onClick={onBackToDashboard}
          className="mb-8 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-warmGray-400 hover:text-primary transition-colors group"
        >
          <Icons.ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Dashboard
        </button>

        <div className="grid grid-cols-12 gap-6 items-start">
          
          {/* LEFT SECTION (8 columns) */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            
            {/* 1. PASSING GRADE BLOCK */}
            <div className="bg-white rounded-xl p-8 border border-primary/5">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Icons.Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Academic Standards</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-warmGray-400">Define your threshold for curriculum mastery</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[50, 60, 70, 80].map((mark) => (
                  <button
                    key={mark}
                    onClick={() => onPassMarkChange(mark)}
                    className={`py-6 rounded-xl font-black transition-all border ${
                      passMarkPercent === mark
                        ? 'bg-primary text-cream border-primary shadow-sm'
                        : 'bg-cream text-warmGray-400 border-primary/5 hover:border-primary/20'
                    }`}
                  >
                    <span className="text-xl">{mark}%</span>
                    <p className="text-[8px] uppercase tracking-tighter mt-1 opacity-70">Pass Mark</p>
                  </button>
                ))}
              </div>
              
              <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-[10px] font-medium text-warmGray-500 italic font-serif leading-relaxed px-2">
                  Modules will only unlock once you've achieved this grade in the previous unit. We recommend 70% for durable learning.
                </p>
              </div>
            </div>

            {/* 2. DATA STATISTICS BLOCK */}
            <div className="bg-white rounded-xl p-8 border border-primary/5">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-tertiary/10 rounded-xl flex items-center justify-center text-tertiary">
                  <Icons.Clipboard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">System Metrics</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-warmGray-400">Historical performance data and generated assets</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="p-8 bg-cream rounded-xl border border-primary/5">
                  <p className="text-4xl font-black text-primary mb-1 tracking-tighter">{subjects.length}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-warmGray-400">Total Courses</p>
                </div>
                <div className="p-8 bg-cream rounded-xl border border-primary/5">
                  <p className="text-4xl font-black text-primary mb-1 tracking-tighter">{totalQuestions}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-warmGray-400">Questions Built</p>
                </div>
                <div className="p-8 bg-cream rounded-xl border border-primary/5">
                  <p className="text-4xl font-black text-primary mb-1 tracking-tighter">{totalAttempts}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-warmGray-400">Sessions Taken</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION (4 columns) */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            
            {/* 3. DANGER ZONE BLOCK */}
            <div className="bg-red-50/50 rounded-xl p-8 border border-red-100 flex flex-col gap-6">
              <div className="flex items-center gap-3 text-red-600">
                <Icons.Trash className="w-5 h-5" />
                <h3 className="text-lg font-black uppercase tracking-tighter italic">Danger Zone</h3>
              </div>
              
              <p className="text-xs font-medium text-red-800/60 leading-relaxed">
                Irreversible deletion of all curriculum data, assessment history, and course progress. Proceed with extreme caution.
              </p>

              {!showClearConfirm ? (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full px-8 py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-sm"
                >
                  Wipe System Data
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border border-red-200">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Confirmation Required</p>
                    <p className="text-xs font-bold text-gray-900">Are you absolutely sure? This action is terminal.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        onClearAllData()
                        setShowClearConfirm(false)
                        onBackToDashboard()
                      }}
                      className="w-full px-8 py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                    >
                      Confirm Destruction
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="w-full px-8 py-4 bg-white text-gray-500 border border-gray-200 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-50 transition-all active:scale-95"
                    >
                      Abort
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. VERSION BLOCK (Bento Placeholder for sidebar balance) */}
            <div className="bg-white rounded-xl p-8 border border-primary/5 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-warmGray-300 mb-1">Terra Engine v2.4.0</p>
              <p className="text-[10px] font-medium text-warmGray-400 italic font-serif leading-relaxed px-4">
                "The roots of education are bitter, but the fruit is sweet."
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
