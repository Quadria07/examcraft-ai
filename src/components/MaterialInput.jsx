import React, { useState } from 'react'
import Icons from './common/Icons'
import { generateQuestionsFromMaterial } from '../utils/data'

export default function MaterialInput({
 unit,
 onUnitUpdate,
 allowReset = false,
}) {
 const [material, setMaterial] = useState(unit.material)
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState('')
 const [showResetConfirm, setShowResetConfirm] = useState(false)
 const [saveSuccess, setSaveSuccess] = useState(false)
 const groqApiKey = import.meta.env.VITE_GROQ_API_KEY

 const wordCount = material.trim().split(/\s+/).filter((w) => w.length > 0).length

 const [showAdvanced, setShowAdvanced] = useState(false)
 const [config, setConfig] = useState({
 mcqCount: 12,
 fitbCount: 6,
 tfCount: 1,
 ynCount: 1,
 difficulty: 'medium',
 })

 const handleConfigChange = (key, value) => {
 setConfig(prev => ({
 ...prev,
 [key]: value
 }))
 }

 const handleSaveMaterial = () => {
 const updatedUnit = {
 ...unit,
 material,
 }
 onUnitUpdate(unit.id, updatedUnit)
 setSaveSuccess(true)
 setTimeout(() => setSaveSuccess(false), 3000)
 }

 const [loadingStatus, setLoadingStatus] = useState('')

 const LOADING_STEPS = [
   'Analyzing academic context...',
   'Identifying core concepts...',
   'Drafting PhD-level assessment...',
   'Structuring curriculum items...',
   'Finalizing academic integrity checks...',
   'Synthesizing results...'
 ]

 const handleGenerateQuestions = async () => {
   if (!groqApiKey) {
     setError('API key missing. Please configure VITE_GROQ_API_KEY.')
     return
   }

   if (material.trim().split(/\s+/).length < 50) {
     setError('Material is too short. Please provide at least 50 words.')
     return
   }

   setLoading(true)
   setError('')
   setSaveSuccess(false)
   setLoadingStatus(LOADING_STEPS[0])

   // Cycle through loading statuses
   const statusInterval = setInterval(() => {
     setLoadingStatus(prev => {
       const currentIndex = LOADING_STEPS.indexOf(prev)
       return LOADING_STEPS[(currentIndex + 1) % LOADING_STEPS.length]
     })
   }, 3000)

   try {
     const questions = await generateQuestionsFromMaterial(material, groqApiKey, config)
     
     const updatedUnit = {
       ...unit,
       material,
       questions,
       status: unit.status === 'passed' ? 'passed' : 'unlocked',
     }

     onUnitUpdate(unit.id, updatedUnit)
     setSaveSuccess(true)
     setTimeout(() => setSaveSuccess(false), 3000)
   } catch (err) {
     setError(err.message || 'Generation failed. Please try again.')
   } finally {
     clearInterval(statusInterval)
     setLoading(false)
   }
 }

 const handleReset = () => {
 const updatedUnit = {
 ...unit,
 material: '',
 questions: [],
 attempts: [],
 status: 'locked',
 bestScore: 0,
 }
 onUnitUpdate(unit.id, updatedUnit)
 setMaterial('')
 setShowResetConfirm(false)
 }

 if (unit.questions.length > 0 && !allowReset) {
 return null
 }

 return (
 <div className="space-y-6">
 <div className="slide-in">
 <div className="flex items-center justify-between mb-3">
 <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
 Course Material
 </label>
 <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
 <Icons.Clipboard className="w-3.5 h-3.5 text-blue-500" />
 <span className="text-[10px] font-black font-mono text-gray-500">
 {wordCount} words
 </span>
 </div>
 </div>
 <textarea
 value={material}
 onChange={(e) => {
 setMaterial(e.target.value)
 setError('')
 setSaveSuccess(false)
 }}
 placeholder="Paste your course content, lecture notes, or textbook extracts here..."
 rows={10}
 className="w-full px-6 py-5 border-2 border-gray-50 rounded-xl font-sans text-sm focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all resize-none placeholder:text-gray-300"
 />
 
 <div className="mt-6">
 <button 
 onClick={() => setShowAdvanced(!showAdvanced)}
 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:opacity-70 transition-opacity"
 >
 <Icons.Settings className={`w-3.5 h-3.5 transition-transform duration-500 ${showAdvanced ? 'rotate-180' : ''}`} />
 {showAdvanced ? 'Hide Options' : 'Assessment Options'}
 </button>

 {showAdvanced && (
 <div className="mt-6 p-8 bg-gray-50/50 rounded-xl border border-gray-100 animation-fade-in grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-6">
 <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
 <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
 Question Types
 </h4>
 <div className="grid grid-cols-2 gap-4">
 {[
 { label: 'Multiple Choice', key: 'mcqCount' },
 { label: 'Fill in the Blank', key: 'fitbCount' },
 { label: 'True/False', key: 'tfCount' },
 { label: 'Yes/No', key: 'ynCount' }
 ].map(type => (
 <div key={type.key}>
 <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{type.label}</label>
 <input 
 type="number"
 min="0"
 max="20"
 value={config[type.key]}
 onChange={(e) => handleConfigChange(type.key, parseInt(e.target.value) || 0)}
 className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
 />
 </div>
 ))}
 </div>
 </div>

 <div className="space-y-6">
 <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
 <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
 Difficulty
 </h4>
 <div className="flex p-1 bg-white rounded-2xl border border-gray-100">
 {['easy', 'medium', 'hard'].map(level => (
 <button
 key={level}
 onClick={() => handleConfigChange('difficulty', level)}
 className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
 config.difficulty === level 
 ? 'bg-blue-600 text-white ' 
 : 'text-gray-400 hover:text-gray-600'
 }`}
 >
 {level}
 </button>
 ))}
 </div>
 <p className="text-[10px] text-gray-400 font-medium italic">
 Controls how challenging the generated questions will be.
 </p>
 </div>
 </div>
 )}
 </div>
 </div>

 {error && (
 <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-900/30 rounded-2xl p-5 flex gap-4 animation-fade-in ">
 <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-xl flex items-center justify-center shrink-0">
 <Icons.X className="w-5 h-5 text-red-600 dark:text-red-400" />
 </div>
 <div className="space-y-1">
 <p className="text-xs font-black uppercase tracking-widest text-red-600">Error</p>
 <p className="text-sm text-red-800/80 dark:text-red-200/80 font-medium">
 {error}
 </p>
 </div>
 </div>
 )}

 {saveSuccess && (
 <div className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-100 dark:border-emerald-900/30 rounded-full py-4 px-8 flex items-center gap-4 animation-fade-in w-fit mx-auto">
 <Icons.Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
 <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">
 Saved successfully
 </p>
 </div>
 )}

 <div className="flex flex-col sm:flex-row gap-4 pt-4">
 <button
 onClick={handleGenerateQuestions}
 disabled={loading || wordCount < 50}
 className={`flex-1 flex items-center justify-center gap-3 px-10 py-5 rounded-xl font-black uppercase tracking-widest transition-all text-xs active:scale-95 ${
 loading || wordCount < 50
 ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed grayscale'
 : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white hover: hover:-translate-y-0.5'
 }`}
 >
 {loading ? (
 <div className="flex flex-col items-center gap-2">
  <div className="flex items-center gap-3">
    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
    <span>Synthesizing...</span>
  </div>
  <span className="text-[8px] font-black tracking-widest opacity-60 animate-pulse">{loadingStatus}</span>
 </div>
 ) : (
 <>
 <Icons.Plus className="w-5 h-5" />
 <span>Generate Questions</span>
 </>
 )}
 </button>

 <button
 onClick={handleSaveMaterial}
 disabled={loading || material.trim() === unit.material}
 className={`flex-1 flex items-center justify-center gap-3 px-10 py-5 rounded-xl font-black uppercase tracking-widest transition-all text-xs border-2 active:scale-95 ${
 loading || material.trim() === unit.material
 ? 'bg-transparent text-gray-300 dark:text-gray-700 border-gray-50 dark:border-gray-800 cursor-not-allowed'
 : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 '
 }`}
 >
 <Icons.Clipboard className="w-5 h-5" />
 <span>Save Material</span>
 </button>

 {allowReset && unit.questions.length > 0 && (
 <div className="flex shrink-0">
 {!showResetConfirm ? (
 <button
 onClick={() => setShowResetConfirm(true)}
 className="w-[4.5rem] h-[4.5rem] flex items-center justify-center bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl transition-all active:scale-95 border-2 border-red-100/20"
 title="Reset Unit"
 >
 <Icons.Trash className="w-6 h-6" />
 </button>
 ) : (
 <div className="flex gap-2 items-center bg-white dark:bg-gray-900 border-2 border-red-100 dark:border-red-900/30 rounded-xl px-4 ml-2 animation-fade-in ">
 <button
 onClick={handleReset}
 className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition active:scale-95"
 >
 Confirm Delete
 </button>
 <button
 onClick={() => setShowResetConfirm(false)}
 className="px-6 py-3 text-gray-400 dark:text-gray-600 text-[10px] font-black uppercase tracking-widest transition hover:text-gray-600"
 >
 Cancel
 </button>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 )
}
