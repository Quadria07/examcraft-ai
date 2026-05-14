import React, { useState, useEffect } from 'react'
import Icons from './common/Icons'
import { v4 as uuidv4 } from 'uuid'
import { transformQuestions, evaluateAnswer } from '../utils/data'
import QuestionCard from './QuestionCard'
import Timer from './Timer'
import confetti from 'canvas-confetti'

export default function PracticeLab({
  practiceLibrary,
  setPracticeLibrary,
  groqApiKey,
  onBackToDashboard
}) {
  const [setupStep, setSetupStep] = useState('select-course') // select-course | select-module | manage-questions | practice | results
  const [selectedCourseId, setSelectedCourseId] = useState(null)
  const [selectedModuleId, setSelectedModuleId] = useState(null)
  
  const [newCourseName, setNewCourseName] = useState('')
  const [newModuleName, setNewModuleName] = useState('')
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [showAddModule, setShowAddModule] = useState(false)

  const [importText, setImportText] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importStage, setImportStage] = useState('')
  const [showImportOptions, setShowImportOptions] = useState(false)
  const [regenMode, setRegenMode] = useState(false) 
  
  const [activePracticeSet, setActivePracticeSet] = useState(null)
  const [timerEnabled, setTimerEnabled] = useState(true)
  const [timerDuration, setTimerDuration] = useState(30)
  const [timeLeft, setTimeLeft] = useState(null)
  
  const [notification, setNotification] = useState(null)
  const [editingQuestion, setEditingQuestion] = useState(null)

  // Notification Helper
  const notify = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // Timer Logic
  useEffect(() => {
    let interval = null
    if (setupStep === 'practice' && activePracticeSet && timerEnabled && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000)
    } else if (timeLeft === 0 && setupStep === 'practice') {
      handleFinishPractice()
    }
    return () => clearInterval(interval)
  }, [setupStep, activePracticeSet, timerEnabled, timeLeft])

  const selectedCourse = practiceLibrary.find(c => c.id === selectedCourseId)
  const selectedModule = selectedCourse?.modules?.find(m => m.id === selectedModuleId)

  // Handlers
  const handleAddCourse = () => {
    if (!newCourseName.trim()) return
    const newCourse = { id: uuidv4(), name: newCourseName, modules: [] }
    setPracticeLibrary((prev) => [...prev, newCourse])
    setNewCourseName(''); setShowAddCourse(false); notify('Course created')
  }

  const handleAddModule = () => {
    if (!newModuleName.trim()) return
    setPracticeLibrary((prev) => prev.map(c => {
      if (c.id === selectedCourseId) {
        return {
          ...c,
          modules: [...(c.modules || []), { id: uuidv4(), name: newModuleName, versions: [] }]
        }
      }
      return c
    }))
    setNewModuleName(''); setShowAddModule(false); notify('Module created')
  }

  const handleProcessImport = async (targetType = 'original') => {
    if (!importText.trim()) return
    setIsImporting(true)
    setShowImportOptions(false)
    
    try {
      setImportStage('Extracting Knowledge...')
      let prompt = `Extract questions and answers from the text provided. 
      CRITICAL RULE 1: The question text MUST remain 100% identical to the source.
      CRITICAL RULE 2: For every question, you MUST provide a "sourceQuote" which is the exact sentence or fragment from the source text where the answer is found.
      CRITICAL RULE 3: DO NOT GUESS. If an answer is not physically written in the text, mark answer as "[Needs Review]".
      
      If the source HAS options (A, B, C, D), set "type": "mcq" and include the "options" array.
      Return ONLY a JSON array of objects: { "question": "...", "answer": "...", "type": "...", "options": [...], "sourceQuote": "..." }`

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: prompt }, { role: 'user', content: importText }],
          temperature: 0.1,
        }),
      })
      
      if (response.status === 429) {
        throw new Error('RATE_LIMIT')
      }

      const data = await response.json()
      const content = data.choices[0].message.content
      const jsonStart = content.indexOf('[')
      const jsonEnd = content.lastIndexOf(']')
      const parsed = JSON.parse(content.substring(jsonStart, jsonEnd + 1))
      
      setImportStage('Strict Validation...')
      const validationPrompt = `Verify these extracted questions against the original source text. 
      Update the "confidence" field (0-100).
      Original Source: """${importText}"""
      Return ONLY JSON with "confidence" (number) and "validationNote" (string) added.`

      const valResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: validationPrompt }, { role: 'user', content: JSON.stringify(parsed) }],
          temperature: 0,
        }),
      })

      if (valResponse.status === 429) {
        throw new Error('RATE_LIMIT')
      }

      const valData = await valResponse.json()
      const valContent = valData.choices[0].message.content
      const validated = JSON.parse(valContent.substring(valContent.indexOf('['), valContent.lastIndexOf(']') + 1))

      const newVersion = {
        id: uuidv4(),
        name: targetType === 'original' ? 'Evidence-Backed Set' : `Verified ${targetType.toUpperCase()}`,
        type: targetType,
        questions: validated.map(q => ({ id: uuidv4(), ...q }))
      }

      setPracticeLibrary((prev) => prev.map(c => {
        if (c.id === selectedCourseId) {
          return {
            ...c,
            modules: (c.modules || []).map(m => {
              if (m.id === selectedModuleId) {
                return { ...m, versions: [...(m.versions || []), newVersion] }
              }
              return m
            })
          }
        }
        return c
      }))
      
      setImportText(''); notify('Practice set saved successfully!')
    } catch (error) {
      if (error.message === 'RATE_LIMIT') {
        notify('AI is busy (Rate Limit). Please wait 60 seconds and try again.', 'error')
      } else {
        notify('Import failed. Please check your internet.', 'error')
      }
    } finally {
      setIsImporting(false); setImportStage('')
    }
  }

  const handleRegenerate = async (targetType) => {
    const baseVersion = selectedModule?.versions?.[0]
    if (!baseVersion?.questions?.length) return notify('No base questions found.', 'error')

    setIsImporting(true)
    setImportStage('Generating New Styles...')
    
    try {
      const transformed = await transformQuestions(baseVersion.questions, targetType, groqApiKey)
      
      const newVersion = {
        id: uuidv4(),
        name: `${targetType.toUpperCase()} Version`,
        type: targetType,
        questions: transformed.map(q => ({ id: uuidv4(), ...q, confidence: 90 }))
      }

      setPracticeLibrary((prev) => prev.map(c => {
        if (c.id === selectedCourseId) {
          return {
            ...c,
            modules: (c.modules || []).map(m => {
              if (m.id === selectedModuleId) {
                return { ...m, versions: [...(m.versions || []), newVersion] }
              }
              return m
            })
          }
        }
        return c
      }))
      
      notify(`${targetType.toUpperCase()} version created!`)
    } catch (error) {
      if (error.message === 'RATE_LIMIT') {
        notify('AI is busy (Rate Limit). Please wait 60 seconds and try again.', 'error')
      } else {
        notify('Generation failed.', 'error')
      }
    } finally {
      setIsImporting(false); setRegenMode(false); setImportStage('')
    }
  }

  const startPractice = (version) => {
    setActivePracticeSet({
      id: version.id,
      name: version.name,
      questions: version.questions,
      currentIndex: 0,
      responses: {},
      startTime: Date.now()
    })
    if (timerEnabled) setTimeLeft(timerDuration * 60)
    setSetupStep('practice')
  }

  const handleFinishPractice = () => {
    let score = 0
    activePracticeSet.questions.forEach(q => {
      if (evaluateAnswer(activePracticeSet.responses[q.id] || '', q.answer, q.type, q.options)) score++
    })
    const percentage = Math.round((score / activePracticeSet.questions.length) * 100)
    setActivePracticeSet({ ...activePracticeSet, score, percentage, endTime: Date.now() })
    if (percentage >= 70) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
    setSetupStep('results')
  }

  const deleteVersion = (versionId) => {
    if (!confirm('Delete this practice set?')) return
    setPracticeLibrary((prev) => prev.map(c => {
      if (c.id === selectedCourseId) {
        return {
          ...c,
          modules: c.modules.map(m => {
            if (m.id === selectedModuleId) {
              return { ...m, versions: m.versions.filter(v => v.id !== versionId) }
            }
            return m
          })
        }
      }
      return c
    }))
    notify('Practice set deleted')
  }

  const handleUpdateQuestion = (updatedQ) => {
    setPracticeLibrary((prev) => prev.map(c => {
      if (c.id === selectedCourseId) {
        return {
          ...c,
          modules: c.modules.map(m => {
            if (m.id === selectedModuleId) {
              return {
                ...m,
                versions: m.versions.map(v => ({
                  ...v,
                  questions: v.questions.map(q => q.id === updatedQ.id ? updatedQ : q)
                }))
              }
            }
            return m
          })
        }
      }
      return c
    }))
    
    if (activePracticeSet) {
      setActivePracticeSet({
        ...activePracticeSet,
        questions: activePracticeSet.questions.map(q => q.id === updatedQ.id ? updatedQ : q)
      })
    }
    setEditingQuestion(null)
    notify('Question updated')
  }

  const getConfidenceColor = (score) => {
    if (score >= 90) return 'bg-primary text-cream'
    if (score >= 70) return 'bg-amber-500 text-white'
    return 'bg-red-500 text-white'
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col text-gray-900">
      {/* Loading Overlay */}
      {isImporting && (
        <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-xl">
           <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
           </div>
           <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">{importStage}</h3>
           <p className="text-warmGray-400 font-bold uppercase text-[10px] tracking-widest animate-pulse">Our AI is processing your material with precision...</p>
        </div>
      )}

      {notification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1000] animation-slide-down">
          <div className={`px-6 py-3 rounded-xl shadow-2xl border flex items-center gap-3 font-black uppercase tracking-widest text-[10px] ${
            notification.type === 'error' ? 'bg-red-600 text-white border-red-500' : 'bg-primary text-cream border-primary/20'
          }`}>
            {notification.message}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-primary/5 px-8 py-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (setupStep === 'select-course') onBackToDashboard()
              else if (setupStep === 'select-module') setSetupStep('select-course')
              else if (setupStep === 'manage-questions') setSetupStep('select-module')
              else if (setupStep === 'practice') { if (confirm('End practice session?')) setSetupStep('manage-questions') }
              else if (setupStep === 'results') setSetupStep('manage-questions')
            }}
            className="p-2 hover:bg-cream rounded-lg transition-colors text-warmGray-400"
          >
            <Icons.ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Practice Lab (AOC)</h1>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">
              {selectedCourse ? selectedCourse.name : 'Select Course'} {selectedModule ? ` • ${selectedModule.name}` : ''}
            </p>
          </div>
        </div>
        {setupStep === 'practice' && timerEnabled && <Timer seconds={timeLeft} isRunning={true} />}
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-8">
        
        {setupStep === 'select-course' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-gray-900 uppercase">Select Course</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {practiceLibrary.map(course => (
                <button key={course.id} onClick={() => { setSelectedCourseId(course.id); setSetupStep('select-module'); }} className="bg-white p-8 rounded-2xl border border-primary/5 hover:border-primary/20 transition-all text-left">
                  <h3 className="text-xl font-black text-gray-900 mb-2">{course.name}</h3>
                  <p className="text-[10px] font-black text-warmGray-400 uppercase tracking-widest">{(course.modules || []).length} Modules</p>
                </button>
              ))}
              <button onClick={() => setShowAddCourse(true)} className="p-8 rounded-2xl border-2 border-dashed border-warmGray-100 text-warmGray-400 font-black uppercase text-xs hover:border-primary transition-all">+ New Course</button>
            </div>
          </div>
        )}

        {setupStep === 'select-module' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-gray-900 uppercase">Select Module</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(selectedCourse?.modules || []).map(module => (
                <button key={module.id} onClick={() => { setSelectedModuleId(module.id); setSetupStep('manage-questions'); }} className="bg-white p-8 rounded-2xl border border-primary/5 hover:border-primary/20 transition-all text-left">
                  <h3 className="text-xl font-black text-gray-900 mb-2">{module.name}</h3>
                  <p className="text-[10px] font-black text-warmGray-400 uppercase tracking-widest">{(module.versions || []).length} Practice Sets</p>
                </button>
              ))}
              <button onClick={() => setShowAddModule(true)} className="p-8 rounded-2xl border-2 border-dashed border-warmGray-100 text-warmGray-400 font-black uppercase text-xs hover:border-primary transition-all">+ New Module</button>
            </div>
          </div>
        )}

        {setupStep === 'manage-questions' && (
          <div className="space-y-12">
            <div className="bg-white rounded-2xl p-8 border border-primary/5 space-y-6 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 uppercase">Import Practice Material</h3>
              <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste your questions and content here..." className="w-full h-40 p-6 bg-cream/30 border border-primary/10 rounded-xl font-bold text-sm focus:outline-none focus:border-primary" />
              <button onClick={() => { setRegenMode(false); setShowImportOptions(true); }} disabled={!importText.trim()} className="w-full py-4 bg-primary text-cream rounded-xl font-black uppercase text-[10px] shadow-lg shadow-primary/20">
                Create Practice Set
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
               {(selectedModule?.versions || []).map((version) => {
                 const avgConf = Math.round(version.questions.reduce((a,q) => a + (q.confidence || 100), 0) / version.questions.length)
                 return (
                   <div key={version.id} className="bg-white p-8 rounded-3xl border border-primary/5 shadow-sm group">
                      <div className="flex justify-between items-start mb-6">
                         <div>
                            <span className={`px-2 py-1 rounded text-[8px] font-black uppercase mb-2 inline-block ${getConfidenceColor(avgConf)}`}>{avgConf}% AI Confidence</span>
                            <h4 className="text-xl font-black text-gray-900">{version.name}</h4>
                         </div>
                         <button onClick={() => deleteVersion(version.id)} className="p-2 text-warmGray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Icons.Trash className="w-5 h-5" /></button>
                      </div>
                      <button onClick={() => startPractice(version)} className="w-full py-4 bg-cream text-primary rounded-xl font-black uppercase text-[10px] border border-primary/10 hover:bg-primary hover:text-white transition-all">Start Exam</button>
                   </div>
                 )
               })}
               {(selectedModule?.versions || []).length > 0 && (
                 <button onClick={() => { setRegenMode(true); setShowImportOptions(true); }} className="p-8 rounded-3xl border-2 border-dashed border-tertiary/20 text-tertiary font-black uppercase text-[10px] hover:border-tertiary transition-all">
                    + Generate New Style
                 </button>
               )}
            </div>
          </div>
        )}

        {setupStep === 'practice' && activePracticeSet && (
          <div className="space-y-8 animation-fade-in pb-20">
             <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-black text-gray-900 uppercase">{activePracticeSet.name}</h2><p className="text-[10px] font-black text-primary uppercase">Question {activePracticeSet.currentIndex + 1} of {activePracticeSet.questions.length}</p></div>
                <div className="w-40 bg-cream h-1.5 rounded-full overflow-hidden border border-primary/5"><div className="bg-primary h-full transition-all" style={{ width: `${((activePracticeSet.currentIndex + 1) / activePracticeSet.questions.length) * 100}%` }} /></div>
             </div>
             <QuestionCard 
                question={activePracticeSet.questions[activePracticeSet.currentIndex]}
                answer={activePracticeSet.responses[activePracticeSet.questions[activePracticeSet.currentIndex].id]}
                onAnswerChange={(val) => setActivePracticeSet({ ...activePracticeSet, responses: { ...activePracticeSet.responses, [activePracticeSet.questions[activePracticeSet.currentIndex].id]: val } })}
                isFlagged={false} onFlag={() => {}}
             />
             <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-primary/5">
               <button disabled={activePracticeSet.currentIndex === 0} onClick={() => setActivePracticeSet({ ...activePracticeSet, currentIndex: activePracticeSet.currentIndex - 1 })} className="px-8 py-4 bg-cream text-primary rounded-xl font-black uppercase text-[10px]">Previous</button>
               {activePracticeSet.currentIndex === activePracticeSet.questions.length - 1 ? (
                 <button onClick={handleFinishPractice} className="px-12 py-4 bg-tertiary text-cream rounded-xl font-black uppercase text-[10px]">Finish</button>
               ) : (
                 <button onClick={() => setActivePracticeSet({ ...activePracticeSet, currentIndex: activePracticeSet.currentIndex + 1 })} className="px-12 py-4 bg-primary text-cream rounded-xl font-black uppercase text-[10px]">Next</button>
               )}
             </div>
          </div>
        )}

        {setupStep === 'results' && activePracticeSet && (
          <div className="space-y-8 pb-20">
             <div className="bg-white rounded-3xl p-12 border border-primary/10 text-center shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 inset-x-0 h-2 ${activePracticeSet.percentage >= 70 ? 'bg-primary' : 'bg-red-500'}`} />
                <h2 className="text-7xl font-black text-gray-900 tracking-tighter mb-4">{activePracticeSet.percentage}%</h2>
                <button onClick={() => setSetupStep('manage-questions')} className="px-10 py-4 bg-primary text-cream rounded-xl font-black uppercase text-[10px]">Continue</button>
             </div>
             <div className="bg-white rounded-2xl border border-primary/5 overflow-hidden">
                <div className="px-8 py-6 border-b border-primary/5 bg-cream/30"><h3 className="text-lg font-black text-gray-900 uppercase">Results Breakdown</h3></div>
                <div className="divide-y divide-primary/5">
                   {activePracticeSet.questions.map((q, idx) => {
                     const userAnswer = activePracticeSet.responses[q.id] || ''; const isCorrect = evaluateAnswer(userAnswer, q.answer, q.type, q.options)
                     return (
                       <div key={q.id} className="p-8 hover:bg-cream/20 transition-all group">
                          <div className="flex items-center justify-between mb-4">
                             <div className="flex items-center gap-3">
                               <span className={`px-2 py-1 rounded text-[8px] font-black uppercase border ${isCorrect ? 'bg-primary/5 text-primary border-primary/10' : 'bg-red-50 text-red-500 border-red-100'}`}>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                               <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${getConfidenceColor(q.confidence || 100)}`}>AI: {q.confidence || 100}%</span>
                             </div>
                             <button onClick={() => setEditingQuestion(q)} className="opacity-0 group-hover:opacity-100 p-2 text-primary hover:bg-primary/5 rounded transition-all flex items-center gap-2 text-[9px] font-black uppercase"><Icons.RefreshCw className="w-3 h-3" /> Fix Answer</button>
                          </div>
                          <p className="font-bold text-gray-900 mb-4">{q.question}</p>
                          {q.sourceQuote && (
                            <div className="mb-4 p-4 bg-amber-50/50 border border-amber-100 rounded-xl italic text-xs text-amber-900/70 line-clamp-3">
                              "{q.sourceQuote}" — Evidence from source
                            </div>
                          )}
                          <div className="grid md:grid-cols-2 gap-6">
                             <div className="p-4 rounded-xl border border-primary/5 bg-cream/10"><p className="text-[8px] font-black text-warmGray-400 uppercase mb-1">You</p><p className="text-sm font-bold">{userAnswer || '(Empty)'}</p></div>
                             <div className="p-4 rounded-xl border border-primary/5 bg-primary/5"><p className="text-[8px] font-black text-primary uppercase mb-1">System</p><p className="text-sm font-bold text-primary">{q.answer}</p></div>
                          </div>
                       </div>
                     )
                   })}
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
           <div className="w-full max-w-2xl bg-white rounded-3xl p-10 shadow-2xl animation-slide-up">
              <h3 className="text-2xl font-black text-gray-900 uppercase mb-6">Correct System Knowledge</h3>
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-warmGray-400 uppercase tracking-widest block mb-2">Question Text</label>
                    <textarea value={editingQuestion.question} onChange={e => setEditingQuestion({...editingQuestion, question: e.target.value})} className="w-full p-4 bg-cream/50 border border-primary/10 rounded-xl font-bold text-sm h-24" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-warmGray-400 uppercase tracking-widest block mb-2">Correct Answer</label>
                    <input type="text" value={editingQuestion.answer} onChange={e => setEditingQuestion({...editingQuestion, answer: e.target.value})} className="w-full p-4 bg-cream/50 border border-primary/10 rounded-xl font-bold text-sm" />
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button onClick={() => handleUpdateQuestion(editingQuestion)} className="flex-1 py-4 bg-primary text-cream rounded-xl font-black uppercase text-[10px]">Save Changes</button>
                    <button onClick={() => setEditingQuestion(null)} className="flex-1 py-4 bg-white text-warmGray-400 border border-primary/10 rounded-xl font-black uppercase text-[10px]">Cancel</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Select Mode Modal */}
      {showImportOptions && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="w-full max-w-xl bg-white rounded-3xl p-10 shadow-2xl text-center">
            <h3 className="text-2xl font-black text-gray-900 uppercase mb-2">{regenMode ? 'New Practice Version' : 'Import with Evidence'}</h3>
            <p className="text-sm text-warmGray-400 mb-8">AI will verify every answer against your source text.</p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {!regenMode && <button onClick={() => handleProcessImport('original')} className="p-6 rounded-2xl border-2 border-primary/10 hover:border-primary transition-all text-left group font-black uppercase text-xs">Original Format</button>}
              {['mcq', 'fitb', 'true_false', 'yes_no'].map(type => (
                <button key={type} onClick={() => regenMode ? handleRegenerate(type) : handleProcessImport(type)} className="p-6 rounded-2xl border-2 border-primary/5 hover:border-tertiary transition-all text-left group font-black uppercase text-xs">{type.replace('_',' ')}</button>
              ))}
            </div>
            <button onClick={() => setShowImportOptions(false)} className="text-warmGray-400 font-black uppercase text-[10px]">Cancel</button>
          </div>
        </div>
      )}

      {showAddCourse && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-10 text-center">
            <h3 className="text-2xl font-black text-gray-900 uppercase mb-8">New Course</h3>
            <input type="text" autoFocus value={newCourseName} onChange={e => setNewCourseName(e.target.value)} placeholder="Course Name" className="w-full px-6 py-4 bg-cream border border-primary/10 rounded-xl mb-6 font-bold text-center" onKeyPress={e => e.key === 'Enter' && handleAddCourse()} />
            <div className="flex gap-3"><button onClick={handleAddCourse} className="flex-1 py-4 bg-primary text-cream rounded-xl font-black text-[10px]">Create</button><button onClick={() => setShowAddCourse(false)} className="flex-1 py-4 bg-white text-warmGray-400 border border-primary/10 rounded-xl font-black text-[10px]">Cancel</button></div>
          </div>
        </div>
      )}

      {showAddModule && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-10 text-center">
            <h3 className="text-2xl font-black text-gray-900 uppercase mb-8">New Module</h3>
            <input type="text" autoFocus value={newModuleName} onChange={e => setNewModuleName(e.target.value)} placeholder="Module Name" className="w-full px-6 py-4 bg-cream border border-primary/10 rounded-xl mb-6 font-bold text-center" onKeyPress={e => e.key === 'Enter' && handleAddModule()} />
            <div className="flex gap-3"><button onClick={handleAddModule} className="flex-1 py-4 bg-primary text-cream rounded-xl font-black text-[10px]">Add Module</button><button onClick={() => setShowAddModule(false)} className="flex-1 py-4 bg-white text-warmGray-400 border border-primary/10 rounded-xl font-black text-[10px]">Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
