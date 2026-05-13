import React, { useState } from 'react'
import Icons from './Icons'

export default function UnitSuggester({ units: initialUnits, onConfirm, onCancel }) {
  const [units, setUnits] = useState(initialUnits)

  const handleTitleChange = (id, newTitle) => {
    setUnits(prev => prev.map(u => u.id === id ? { ...u, title: newTitle } : u))
  }

  const handleDelete = (id) => {
    setUnits(prev => prev.filter(u => u.id !== id))
  }

  return (
    <div className="animation-fade-in p-10 bg-white rounded-xl border border-primary/10 shadow-2xl">
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Icons.Award className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Academic Proposal</span>
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Curriculum Structure</h2>
        </div>
        <button 
          onClick={onCancel}
          className="p-4 hover:bg-cream rounded-xl transition-colors text-warmGray-300 hover:text-primary"
        >
          <Icons.X className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-4 mb-10 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
        {units.map((unit, index) => (
          <div key={unit.id} className="group relative bg-cream p-6 rounded-xl border border-primary/5 hover:border-primary/20 transition-all">
            <div className="flex items-start gap-6">
              <div className="text-2xl font-black text-warmGray-200 pt-1 font-serif">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className="flex-1">
                <input 
                  type="text"
                  value={unit.title}
                  onChange={(e) => handleTitleChange(unit.id, e.target.value)}
                  className="w-full bg-transparent text-lg font-black text-gray-900 focus:outline-none focus:text-primary font-serif"
                />
                <p className="text-[10px] font-medium text-warmGray-400 mt-2 line-clamp-2 italic leading-relaxed">
                  {unit.material.substring(0, 150)}...
                </p>
              </div>
              <button 
                onClick={() => handleDelete(unit.id)}
                className="p-2 text-warmGray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Icons.Trash className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => onConfirm(units)}
          className="flex-1 px-10 py-5 bg-primary text-cream rounded-xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all shadow-md"
        >
          Inject into Curriculum
        </button>
        <button
          onClick={onCancel}
          className="px-10 py-5 bg-white text-warmGray-400 border border-primary/10 hover:bg-cream rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
        >
          Discard Suggestion
        </button>
      </div>
    </div>
  )
}
