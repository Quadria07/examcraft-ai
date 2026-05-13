import React from 'react'
import Icons from './common/Icons'

export default function Header({ title, onSettings }) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-primary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Icons.Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">ExamCraft AI</h1>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[10px] uppercase font-black tracking-widest text-warmGray-400">{title}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onSettings && (
              <button
                onClick={onSettings}
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-primary/10 hover:bg-cream transition-all active:scale-95 text-warmGray-400 hover:text-primary shadow-sm"
                title="System Settings"
              >
                <Icons.Settings className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
