import React, { useState } from 'react'
import Header from './Header'
import Icons from './common/Icons'
import AnalyticsView from './common/AnalyticsView'

export default function Dashboard({
 subjects,
 onAddSubject,
 onDeleteSubject,
 onSelectSubject,
 onSettings,
 onPractice,
}) {
  const [newSubjectName, setNewSubjectName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [subjectToDelete, setSubjectToDelete] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // grid | list
  const [quoteIndex] = useState(() => Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length))

  const handleAddSubject = () => {
    if (newSubjectName.trim()) {
      onAddSubject(newSubjectName)
      setNewSubjectName('')
      setShowAddForm(false)
    }
  }

  const confirmDelete = () => {
    if (subjectToDelete) {
      onDeleteSubject(subjectToDelete)
      setSubjectToDelete(null)
    }
  }

  const getProgressStats = (subject) => {
    const completed = subject.units.filter((u) => u.status === 'passed').length
    const total = subject.units.length
    return { completed, total }
  }

  // Calculate global stats for Bento sidebar
  const totalXP = subjects.reduce((acc, s) => acc + (s.stats?.xp || 0), 0)
  const totalStreak = Math.max(...subjects.map(s => s.stats?.streak || 0), 0)
  const totalMastery = subjects.length > 0 
    ? Math.round(subjects.reduce((acc, s) => {
        const { completed, total } = getProgressStats(s)
        return acc + (total > 0 ? (completed / total) * 100 : 0)
      }, 0) / subjects.length)
    : 0

  return (
    <div className="min-h-screen bg-cream">
      <Header
        title="ExamCraft AI"
        onSettings={onSettings}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        <div className="grid grid-cols-12 gap-6">
          
          {/* LEFT SECTION (8 columns) */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            
            {/* 1. HEADER BLOCK: GREETING & QUOTE */}
            <div className="bg-white rounded-xl p-8 border border-primary/5 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                  {(() => {
                    const hour = new Date().getHours()
                    if (hour < 12) return 'Good morning'
                    if (hour < 18) return 'Good afternoon'
                    return 'Good evening'
                  })()}, Scholar.
                </h2>
                <p className="text-sm text-warmGray-500 font-medium max-w-md italic">
                  "{MOTIVATIONAL_QUOTES[quoteIndex]}"
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-tertiary">Current Streak</p>
                  <p className="text-2xl font-black text-gray-900">{totalStreak} Days</p>
                </div>
                <div className="w-14 h-14 bg-cream rounded-full border border-tertiary/20 flex items-center justify-center text-tertiary font-black text-xl">
                  {totalStreak}
                </div>
              </div>
            </div>

            {/* 2. MAIN COURSE AREA */}
            <div className="bg-white rounded-xl p-8 border border-primary/5 min-h-[500px] flex flex-col">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">My Courses</h3>
                  <div className="flex p-1 bg-cream rounded-lg border border-primary/5">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-warmGray-400'}`}
                    >
                      <Icons.Grid className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-warmGray-400'}`}
                    >
                      <Icons.List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="text-primary text-xs font-black uppercase tracking-widest hover:opacity-70 transition-opacity"
                >
                  + New Course
                </button>
              </div>

              {subjects.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-warmGray-100 rounded-xl">
                  <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center text-primary mb-6">
                    <Icons.Plus className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Initialize Curriculum</h4>
                  <p className="text-sm text-warmGray-400 max-w-xs mx-auto mb-8">Add your first course to begin your academic journey.</p>
                  <button 
                    onClick={() => setShowAddForm(true)}
                    className="bg-primary text-cream px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs"
                  >
                    Add Course
                  </button>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-4"}>
                  {subjects.map((subject) => {
                    const { completed, total } = getProgressStats(subject)
                    const progressPercent = total > 0 ? (completed / total) * 100 : 0
                    
                    if (viewMode === 'list') {
                      return (
                        <div 
                          key={subject.id}
                          onClick={() => onSelectSubject(subject.id)}
                          className="group flex items-center gap-6 p-5 bg-cream rounded-xl border border-primary/5 hover:border-primary/20 transition-all cursor-pointer"
                        >
                          <div className="w-12 h-12 bg-white rounded-lg border border-primary/10 flex items-center justify-center text-primary font-black text-xs">
                            {subject.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{subject.name}</h4>
                            <p className="text-[10px] font-black text-warmGray-400 uppercase tracking-widest">{total} Modules • {completed} Completed</p>
                          </div>
                          <div className="w-32 hidden sm:block">
                            <div className="w-full bg-white h-1 rounded-full overflow-hidden">
                              <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
                            </div>
                          </div>
                          <button className="p-2 text-warmGray-300 hover:text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); setSubjectToDelete(subject.id); }}>
                            <Icons.Trash className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={subject.id}
                        onClick={() => onSelectSubject(subject.id)}
                        className="bg-cream rounded-xl p-6 border border-primary/5 hover:border-primary/20 transition-all cursor-pointer group flex flex-col h-full relative"
                      >
                        <button 
                          className="absolute top-4 right-4 p-2 text-warmGray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); setSubjectToDelete(subject.id); }}
                        >
                          <Icons.Trash className="w-4 h-4" />
                        </button>

                        <div className="flex justify-between items-start mb-6 pr-8">
                          <span className="text-[10px] font-black uppercase tracking-widest text-tertiary bg-white px-3 py-1 rounded-full border border-tertiary/10">
                            {total} Modules
                          </span>
                        </div>
                        
                        <h3 className="text-xl font-black text-gray-900 mb-6 group-hover:text-primary transition-colors leading-tight flex-1">
                          {subject.name}
                        </h3>

                        <div className="mt-auto">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-warmGray-400">Mastery</p>
                            <p className="text-[10px] font-black text-primary uppercase">{Math.round(progressPercent)}%</p>
                          </div>
                          <div className="w-full bg-white h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-primary h-full transition-all duration-1000"
                              style={{ width: `${progressPercent}%` }}
                            />
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
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            
            {/* 3. INSIGHTS BLOCK */}
            <div className="bg-tertiary/5 rounded-xl p-8 border border-tertiary/10 flex flex-col justify-between min-h-[300px]">
              <div>
                <h3 className="text-tertiary font-black uppercase tracking-widest text-xs mb-8">Performance Insights</h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-warmGray-500 italic font-serif">Average Mastery</span>
                    <span className="text-3xl font-black text-gray-900">{totalMastery}%</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-warmGray-500 italic font-serif">Accumulated Experience</span>
                    <span className="text-3xl font-black text-gray-900">{totalXP} <span className="text-xs font-black text-warmGray-400 uppercase ml-1">XP</span></span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => onSettings()}
                className="w-full py-4 bg-tertiary text-cream rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity mt-10"
              >
                View detailed analytics
              </button>
            </div>

            {/* 4. ACTION / LIBRARY BLOCK */}
            <div className="bg-primary/5 rounded-xl p-8 border border-primary/10 flex flex-col items-center justify-center text-center gap-6 min-h-[300px]">
              <div className="w-16 h-16 bg-white rounded-full border border-primary/20 flex items-center justify-center text-primary">
                <Icons.Clipboard className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-black text-gray-900 mb-2">Knowledge Hub</h4>
                <p className="text-xs text-warmGray-500 font-medium leading-relaxed px-4">
                  Every minute spent studying today builds the foundation for tomorrow's success.
                </p>
              </div>
              <button 
                onClick={onPractice}
                className="w-full py-4 bg-primary text-cream rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Practice Lab (AOC)
              </button>
            </div>
          </div>
        </div>

        {/* New Course Modal */}
        {showAddForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <div className="w-full max-w-xl bg-white rounded-xl p-10 border border-primary/10 animation-slide-up">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Initialize Course</h3>
                <p className="text-sm text-warmGray-400 mt-1">Start a new chapter in your learning journey</p>
              </div>
              
              <input
                type="text"
                autoFocus
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="Course Name (e.g., Quantum Physics)"
                className="w-full px-6 py-5 bg-white text-gray-900 rounded-xl mb-8 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold border border-primary/10 focus:border-primary/30"
                onKeyPress={(e) => e.key === 'Enter' && handleAddSubject()}
              />

              <div className="flex gap-4">
                <button
                  onClick={handleAddSubject}
                  className="flex-1 px-8 py-5 bg-primary text-cream rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewSubjectName('')
                  }}
                  className="flex-1 px-8 py-5 bg-white text-primary border border-primary/30 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-cream transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {subjectToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-xl p-10 border border-red-100 animation-slide-up">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icons.Trash className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Delete Course?</h3>
                <p className="text-sm text-warmGray-400 mt-2">
                  This will permanently remove the course and all associated module data. This action cannot be undone.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmDelete}
                  className="w-full px-8 py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                >
                  Confirm Deletion
                </button>
                <button
                  onClick={() => setSubjectToDelete(null)}
                  className="w-full px-8 py-4 bg-white text-primary border border-primary/30 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-cream transition-all active:scale-95"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

const MOTIVATIONAL_QUOTES = [
  "Knowledge is the only treasure that grows when shared.",
  "The expert in anything was once a beginner.",
  "Focus on progress, not perfection.",
  "Every module completed is a step toward mastery.",
  "Your future self will thank you for studying today.",
  "Consistency is the key to academic excellence.",
  "Mastery begins with a single question.",
  "Turn your obstacles into opportunities for growth.",
  "Success is the sum of small efforts repeated daily.",
  "Learning is a treasure that will follow its owner everywhere.",
  "The mind is not a vessel to be filled, but a fire to be kindled.",
  "Do not wait for opportunity. Create it.",
  "Your education is a dress rehearsal for a life that is yours to lead.",
  "Small steps in the right direction can turn into the biggest steps of your life.",
  "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.",
  "Wisdom is not a product of schooling but of the lifelong attempt to acquire it.",
  "An investment in knowledge pays the best interest.",
  "The roots of education are bitter, but the fruit is sweet.",
  "Study without desire spoils the memory, and it retains nothing that it takes in.",
  "A man's mind, stretched by a new idea, never returns to its original dimensions.",
  "The direction in which education starts a man will determine his future life.",
  "Education is the movement from darkness to light.",
  "The beautiful thing about learning is that no one can take it away from you.",
  "He who asks is a fool for five minutes, but he who does not ask remains a fool forever."
]

