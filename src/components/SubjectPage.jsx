import React, { useState } from 'react'
import Header from './Header'
import MaterialInput from './MaterialInput'
import FileUpload from './common/FileUpload'
import UnitSuggester from './common/UnitSuggester'
import FlashcardStudy from './common/FlashcardStudy'
import { createUnit, proposeUnitsFromMaterial } from '../utils/data'
import { exportUnitToPDF } from '../utils/pdfExport'
import Icons from './common/Icons'

export default function SubjectPage({
  subjects,
  setSubjects,
  subjectId,
  onStartExam,
  onBackToDashboard,
}) {
  const subject = subjects.find((s) => s.id === subjectId)
  const [showAddUnitForm, setShowAddUnitForm] = useState(false)
  const [newUnitTitle, setNewUnitTitle] = useState('')
  const [processingFile, setProcessingFile] = useState(false)
  const [suggestedUnits, setSuggestedUnits] = useState(null)
  const [activeStudyUnit, setActiveStudyUnit] = useState(null)
  const [viewMode, setViewMode] = useState('list') // grid | list
  const [unitToDelete, setUnitToDelete] = useState(null)
  const [unitConfigs, setUnitConfigs] = useState({}) // unitId -> { difficulty: 'mixed', mcqCount: 12, ... }
  const [regeneratingId, setRegeneratingId] = useState(null)
  const [showRegenModalId, setShowRegenModalId] = useState(null)
  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY

  if (!subject) return null

  const handleAddUnit = () => {
    if (newUnitTitle.trim()) {
      const newUnit = createUnit(newUnitTitle)
      // If it's the first unit, unlock it
      if (subject.units.length === 0) {
        newUnit.status = 'unlocked'
      }
      
      const updatedSubject = {
        ...subject,
        units: [...subject.units, newUnit],
      }

      setSubjects(subjects.map((s) => (s.id === subjectId ? updatedSubject : s)))
      setNewUnitTitle('')
      setShowAddUnitForm(false)
    }
  }

  const handleDeleteUnit = (unitId) => {
    const updatedSubject = {
      ...subject,
      units: subject.units.filter((u) => u.id !== unitId),
    }
    setSubjects(subjects.map((s) => (s.id === subjectId ? updatedSubject : s)))
  }

  const handleUnitUpdate = (unitId, updatedUnit) => {
    const updatedSubject = {
      ...subject,
      units: subject.units.map((u) => (u.id === unitId ? updatedUnit : u)),
    }
    setSubjects(subjects.map((s) => (s.id === subjectId ? updatedSubject : s)))
  }

  const handleStartExamClick = (unitId, timerEnabled, timerDuration) => {
    const unitIndex = subject.units.findIndex((u) => u.id === unitId)
    if (unitIndex !== -1) {
      onStartExam(subjectId, unitIndex, timerEnabled, timerDuration)
    }
  }

  const handleFileParsed = async (content) => {
    setProcessingFile(true)
    try {
      const units = await proposeUnitsFromMaterial(content, groqApiKey)
      setSuggestedUnits(units)
    } catch (err) {
      console.error("Curriculum generation error:", err);
    } finally {
      setProcessingFile(false)
    }
  }

  const handleConfirmSuggestedUnits = (units) => {
    const updatedSubject = {
      ...subject,
      units: [...subject.units, ...units],
    }
    setSubjects(subjects.map((s) => (s.id === subjectId ? updatedSubject : s)))
    setSuggestedUnits(null)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800'
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
      case 'unlocked':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600'
    }
  }

  const renderStatusIcon = (status) => {
    const iconClass = "w-4 h-4 mr-1.5"
    switch (status) {
      case 'passed':
        return <Icons.Check className={iconClass} />
      case 'failed':
        return <Icons.X className={iconClass} />
      case 'locked':
        return <Icons.Lock className={iconClass} />
      default:
        return <Icons.Circle className={iconClass} />
    }
  }

  const confirmDeleteUnit = () => {
    if (unitToDelete) {
      handleDeleteUnit(unitToDelete)
      setUnitToDelete(null)
    }
  }

  // Calculate mastery for this subject
  const { completed, total } = subject.units.length > 0 
    ? { 
        completed: subject.units.filter(u => u.status === 'passed').length,
        total: subject.units.length
      }
    : { completed: 0, total: 0 }
  
  const progressPercent = total > 0 ? (completed / total) * 100 : 0


  if (activeStudyUnit) {
    return (
      <FlashcardStudy 
        questions={activeStudyUnit.questions} 
        onExit={() => setActiveStudyUnit(null)} 
      />
    )
  }

  const handleDifficultyChange = (unitId, difficulty) => {
    setUnitConfigs(prev => ({
      ...prev,
      [unitId]: { ...(prev[unitId] || { difficulty: 'mixed', mcqCount: 12, fitbCount: 6, tfCount: 1, ynCount: 1 }), difficulty }
    }))
  }

  const handleRegenerateQuestions = async (unit) => {
    if (!groqApiKey || !unit) return
    const config = unitConfigs[unit.id] || { 
      difficulty: 'mixed',
      mcqCount: 12,
      fitbCount: 6,
      tfCount: 1,
      ynCount: 1
    }
    
    setRegeneratingId(unit.id)
    setShowRegenModalId(null) // Close configuration modal when starting synthesis
    
    try {
      const { generateQuestionsFromMaterial } = await import('../utils/data')
      const questions = await generateQuestionsFromMaterial(unit.material, groqApiKey, {
        difficulty: config.difficulty,
        mcqCount: config.mcqCount || 12,
        fitbCount: config.fitbCount || 6,
        tfCount: config.tfCount || 1,
        ynCount: config.ynCount || 1,
      })
      
      const updatedUnit = {
        ...unit,
        questions,
      }
      handleUnitUpdate(unit.id, updatedUnit)
    } catch (err) {
      console.error("Regeneration error:", err)
    } finally {
      setRegeneratingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-cream text-gray-900">
      <Header
        title={`${subject.name}`}
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

        <div className="grid grid-cols-12 gap-6">
          
          {/* LEFT SECTION (8 columns) */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            
            {/* 1. COURSE INFO BLOCK */}
            <div className="bg-white rounded-xl p-8 border border-primary/5">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2 leading-tight">
                    {subject.name}
                  </h1>
                  <p className="text-sm text-warmGray-500 font-medium">
                    Academic Curriculum • {total} Modules Initialized
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Overall Mastery</p>
                  <p className="text-2xl font-black text-gray-900">{Math.round(progressPercent)}%</p>
                </div>
              </div>
              <div className="w-full bg-cream h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            {/* 2. MODULE LIST AREA */}
            <div className="bg-white rounded-xl p-8 border border-primary/5 min-h-[500px] flex flex-col">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Study Modules</h3>
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
                  onClick={() => setShowAddUnitForm(true)}
                  className="text-primary text-xs font-black uppercase tracking-widest hover:opacity-70 transition-opacity"
                >
                  + Add Module
                </button>
              </div>

              {suggestedUnits ? (
                <UnitSuggester 
                  units={suggestedUnits} 
                  onConfirm={handleConfirmSuggestedUnits}
                  onCancel={() => setSuggestedUnits(null)}
                />
              ) : subject.units.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-warmGray-100 rounded-xl">
                  <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center text-primary mb-6">
                    <Icons.Clipboard className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Empty Curriculum</h4>
                  <p className="text-sm text-warmGray-400 max-w-xs mx-auto mb-8">No study modules found. Upload your source material to generate your curriculum.</p>
                  <button 
                    onClick={() => setProcessingFile('upload')}
                    className="bg-primary text-cream px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs"
                  >
                    Upload Material
                  </button>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "flex flex-col gap-4"}>
                  {subject.units.map((unit, index) => {
                    const isNewUnit = unit.questions.length === 0
                    const currentConfig = unitConfigs[unit.id] || { difficulty: 'mixed' }
                    
                    return (
                      <div 
                        key={unit.id}
                        className={`bg-cream rounded-xl p-6 border border-primary/5 hover:border-primary/20 transition-all group relative flex flex-col ${
                          viewMode === 'grid' ? (isNewUnit ? 'md:col-span-2' : 'h-full') : 'h-auto'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-black text-warmGray-300">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${getStatusColor(unit.status)}`}>
                              {renderStatusIcon(unit.status)} {unit.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              className={`p-1.5 transition-colors ${regeneratingId === unit.id ? 'text-primary animate-spin' : 'text-warmGray-300 hover:text-primary'}`}
                              onClick={() => setShowRegenModalId(unit.id)}
                              title="Configure & Regenerate"
                              disabled={regeneratingId === unit.id}
                            >
                              <Icons.RefreshCw className="w-4 h-4" />
                            </button>
                            <button 
                              className="p-1.5 text-warmGray-300 hover:text-red-500 transition-colors"
                              onClick={() => setUnitToDelete(unit.id)}
                            >
                              <Icons.Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <h4 className={`text-lg font-bold text-gray-900 leading-tight group-hover:text-primary transition-colors ${isNewUnit ? 'mb-4' : 'mb-6 flex-1'}`}>
                          {unit.title}
                        </h4>

                        {isNewUnit ? (
                          <div className="mt-auto pt-4 border-t border-primary/5">
                            {unit.status === 'locked' ? (
                              <div className="flex flex-col items-center justify-center py-12 bg-white/40 rounded-xl border border-dashed border-primary/10">
                                <Icons.Lock className="w-8 h-8 text-warmGray-200 mb-3" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-warmGray-400">Locked Module</p>
                                <p className="text-[9px] font-medium text-warmGray-300 mt-1 px-4 text-center">Complete the previous assessment to unlock this curriculum unit.</p>
                              </div>
                            ) : (
                              <MaterialInput
                                unit={unit}
                                onUnitUpdate={handleUnitUpdate}
                                allowReset={true}
                              />
                            )}
                          </div>
                        ) : (
                          <div className="mt-auto space-y-4">
                            {/* Difficulty Selector */}
                            <div className="flex items-center justify-between gap-2 p-1 bg-white/50 rounded-lg border border-primary/5">
                              {['mixed', 'easy', 'medium', 'hard'].map((level) => (
                                <button
                                  key={level}
                                  onClick={() => handleDifficultyChange(unit.id, level)}
                                  className={`flex-1 py-1 rounded-md text-[7px] font-black uppercase tracking-widest transition-all ${
                                    currentConfig.difficulty === level 
                                      ? 'bg-primary text-cream shadow-sm' 
                                      : 'text-warmGray-300 hover:text-warmGray-500'
                                  }`}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-warmGray-400 px-1">
                              <span>Best Score</span>
                              <span className="text-primary">{unit.bestScore || 0}%</span>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleStartExamClick(unit.id, false, 30)}
                                className="flex-1 px-4 py-2.5 bg-primary text-cream rounded-lg font-black uppercase tracking-widest text-[9px] transition active:scale-95 shadow-sm"
                              >
                                Assessment
                              </button>
                              <button
                                onClick={() => setActiveStudyUnit(unit)}
                                className="px-4 py-2.5 bg-white text-primary border border-primary/20 rounded-lg font-black uppercase tracking-widest text-[9px] transition active:scale-95 flex items-center justify-center gap-2"
                              >
                                <Icons.Award className="w-3 h-3" />
                                Study
                              </button>
                              <button
                                onClick={() => exportUnitToPDF(subject, unit)}
                                className="px-3 py-2.5 bg-white text-warmGray-400 border border-warmGray-100 rounded-lg hover:text-primary transition-all active:scale-95"
                                title="Export PDF"
                              >
                                <Icons.Clipboard className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SECTION (4 columns) */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            
            {/* 3. STATS BLOCK */}
            <div className="bg-tertiary/5 rounded-xl p-8 border border-tertiary/10 flex flex-col gap-8">
              <h3 className="text-tertiary font-black uppercase tracking-widest text-xs">Course Performance</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-tertiary/10">
                  <p className="text-[10px] font-black uppercase text-warmGray-400 mb-1">Level</p>
                  <p className="text-xl font-black text-gray-900">{subject.stats?.level || 1}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-tertiary/10">
                  <p className="text-[10px] font-black uppercase text-warmGray-400 mb-1">Experience</p>
                  <p className="text-xl font-black text-gray-900">{subject.stats?.xp || 0} XP</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-tertiary/10 col-span-2 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase text-warmGray-400 mb-1">Current Streak</p>
                    <p className="text-xl font-black text-gray-900">{subject.stats?.streak || 0} Days</p>
                  </div>
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                    <Icons.Award className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. ACTIONS BLOCK */}
            <div className="bg-primary/5 rounded-xl p-8 border border-primary/10 flex flex-col gap-6">
              <h3 className="text-primary font-black uppercase tracking-widest text-xs">Resource Management</h3>
              
              <div className="space-y-3">
                <button 
                  onClick={() => setProcessingFile('upload')}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-cream rounded-xl font-black uppercase tracking-widest text-[10px] hover:opacity-90 transition-all"
                >
                  <Icons.Plus className="w-4 h-4" />
                  Sync New Material
                </button>
                <button 
                  onClick={() => setShowAddUnitForm(true)}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-primary border border-primary/30 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-cream transition-all"
                >
                  Manual Module Entry
                </button>
              </div>

              <div className="mt-4 p-4 bg-white/50 rounded-xl border border-primary/5 text-center">
                <p className="text-[10px] font-medium text-warmGray-400 leading-relaxed italic font-serif px-2">
                  Propose new study units by analyzing lecture notes, textbooks, or research papers.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Processing State / Upload */}
        {processingFile === 'upload' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-white rounded-xl p-10 border border-primary/10 shadow-2xl animation-slide-up">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Curriculum Synthesis</h3>
                <p className="text-sm text-warmGray-400 mt-1">Upload material to generate professional study modules</p>
              </div>
              <FileUpload onFileParsed={handleFileParsed} loading={processingFile === true} />
              <button 
                onClick={() => setProcessingFile(false)}
                className="w-full mt-6 py-4 bg-white text-primary border border-primary/30 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Manual Add Module Modal */}
        {showAddUnitForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <div className="w-full max-w-xl bg-white rounded-xl p-10 border border-primary/10 animation-slide-up">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">New Study Module</h3>
                <p className="text-sm text-warmGray-400 mt-1">Initialize a module manually to begin content curation</p>
              </div>
              
              <input
                type="text"
                autoFocus
                value={newUnitTitle}
                onChange={(e) => setNewUnitTitle(e.target.value)}
                placeholder="Module Title (e.g., DNA Replication)"
                className="w-full px-6 py-5 bg-cream rounded-xl mb-8 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold border border-primary/10 focus:border-primary/30"
                onKeyPress={(e) => e.key === 'Enter' && handleAddUnit()}
              />

              <div className="flex gap-4">
                <button
                  onClick={handleAddUnit}
                  className="flex-1 px-8 py-5 bg-primary text-cream rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowAddUnitForm(false)
                    setNewUnitTitle('')
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
        {unitToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-xl p-10 border border-red-100 animation-slide-up">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icons.Trash className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Remove Module?</h3>
                <p className="text-sm text-warmGray-400 mt-2">
                  This will permanently delete this study module and all its generated assessment data.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmDeleteUnit}
                  className="w-full px-8 py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                >
                  Confirm Removal
                </button>
                <button
                  onClick={() => setUnitToDelete(null)}
                  className="w-full px-8 py-4 bg-white text-primary border border-primary/30 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-cream transition-all active:scale-95"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Regeneration Config Modal */}
        {showRegenModalId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <div className="w-full max-w-xl bg-white rounded-xl p-10 border border-primary/10 animation-slide-up">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Assessment Synthesis</h3>
                <p className="text-sm text-warmGray-400 mt-1">Configure your custom examination structure</p>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                {[
                  { label: 'Multiple Choice', key: 'mcqCount' },
                  { label: 'Fill in Blank', key: 'fitbCount' },
                  { label: 'True / False', key: 'tfCount' },
                  { label: 'Yes / No', key: 'ynCount' }
                ].map(type => (
                  <div key={type.key}>
                    <label className="block text-[10px] font-black text-warmGray-400 uppercase tracking-widest mb-2">{type.label}</label>
                    <input 
                      type="number"
                      min="0"
                      max="30"
                      value={(unitConfigs[showRegenModalId] || { mcqCount: 12, fitbCount: 6, tfCount: 1, ynCount: 1 })[type.key]}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setUnitConfigs(prev => ({
                          ...prev,
                          [showRegenModalId]: { ...(prev[showRegenModalId] || { mcqCount: 12, fitbCount: 6, tfCount: 1, ynCount: 1 }), [type.key]: val }
                        }))
                      }}
                      className="w-full px-4 py-3 bg-cream border border-primary/5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => handleRegenerateQuestions(subject.units.find(u => u.id === showRegenModalId))}
                  className="flex-1 px-8 py-5 bg-primary text-cream rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Icons.RefreshCw className="w-4 h-4" />
                  Regenerate Now
                </button>
                <button
                  onClick={() => setShowRegenModalId(null)}
                  className="flex-1 px-8 py-5 bg-white text-primary border border-primary/30 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-cream transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
