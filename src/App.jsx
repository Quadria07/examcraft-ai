import React, { useState, useEffect } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useExamSession } from './hooks/useExamSession'
import Dashboard from './components/Dashboard'
import SubjectPage from './components/SubjectPage'
import ExamScreen from './components/ExamScreen'
import ResultsPage from './components/ResultsPage'
import Settings from './components/Settings'
import PracticeLab from './components/PracticeLab'
import { createSubject } from './utils/data'

import Icons from './components/common/Icons'

export default function App() {
 const [subjects, setSubjects] = useLocalStorage('subjects', [])
 const [practiceLibrary, setPracticeLibrary] = useLocalStorage('practiceLibrary', [])
 const [passMarkPercent, setPassMarkPercent] = useLocalStorage('passMarkPercent', 70)
 const groqApiKey = import.meta.env.VITE_GROQ_API_KEY

 const [screen, setScreen] = useState('dashboard')
 const [selectedSubjectId, setSelectedSubjectId] = useState(null)
 const [selectedUnitIndex, setSelectedUnitIndex] = useState(null)
 const [examMode, setExamMode] = useState(false)
 const [examTimer, setExamTimer] = useState(null)
 const [timerEnabled, setTimerEnabled] = useState(false)
 const [timerDuration, setTimerDuration] = useState(30)
 const [showResumeDialog, setShowResumeDialog] = useState(false)
 const [lastXPGained, setLastXPGained] = useState(0)

 const { getExamSession, hasActiveSession, clearExamSession } = useExamSession()


 // Check for active exam session on mount
 useEffect(() => {
 if (hasActiveSession()) {
 setShowResumeDialog(true)
 }
 }, [])

 const handleAddSubject = (name) => {
 const newSubject = createSubject(name)
 setSubjects([...subjects, newSubject])
 }

 const handleDeleteSubject = (subjectId) => {
 setSubjects(subjects.filter((s) => s.id !== subjectId))
 }

 const handleGoToSubject = (subjectId) => {
 setSelectedSubjectId(subjectId)
 setScreen('subject')
 }

 const handleStartExam = (subjectId, unitIndex, timerEnabled, timerDuration) => {
 setSelectedSubjectId(subjectId)
 setSelectedUnitIndex(unitIndex)
 setTimerEnabled(timerEnabled)
 setTimerDuration(timerDuration)
 setExamMode(true)
 setScreen('exam')
 
 if (timerEnabled) {
 setExamTimer(timerDuration * 60) // Convert to seconds
 }
 }

 const handleExamSubmit = (scores, xp) => {
 setLastXPGained(xp || 0)
 setExamMode(false)
 setScreen('results')
 }

 const handleReturnToDashboard = () => {
 setScreen('dashboard')
 setSelectedSubjectId(null)
 setSelectedUnitIndex(null)
 setExamTimer(null)
 setTimerEnabled(false)
 }

 const handleResumeExam = () => {
 const session = getExamSession()
 if (session) {
 setSelectedSubjectId(session.subjectId)
 setSelectedUnitIndex(session.unitIndex)
 setExamMode(true)
 setScreen('exam')
 setExamTimer(session.timerSeconds)
 setShowResumeDialog(false)
 }
 }

 const handleDiscardExam = () => {
 clearExamSession()
 setShowResumeDialog(false)
 }

 return (
 <div className="min-h-screen bg-white text-gray-900">
 {/* Resume Exam Dialog */}
 {showResumeDialog && (
 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
 <div className="bg-white rounded-2xl max-w-sm w-full p-8 border border-gray-100 transform transition-all">
 <div className="flex flex-col items-center text-center mb-6">
 <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
 <Icons.Clipboard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
 </div>
 <h3 className="text-xl font-bold text-gray-900">Resume Assessment?</h3>
 <p className="text-sm text-gray-600 mt-2">
 You have an assessment in progress. Would you like to continue where you left off?
 </p>
 </div>
 <div className="flex gap-3">
 <button
 onClick={handleResumeExam}
 className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
 >
 Resume
 </button>
 <button
 onClick={handleDiscardExam}
 className="flex-1 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition"
 >
 Discard
 </button>
 </div>
 </div>
 </div>
 )}
 {screen === 'dashboard' && (
 <Dashboard
 subjects={subjects}
 onAddSubject={handleAddSubject}
 onDeleteSubject={handleDeleteSubject}
 onSelectSubject={handleGoToSubject}
 onSettings={() => setScreen('settings')}
 onPractice={() => setScreen('practice')}
 />
 )}

 {screen === 'subject' && selectedSubjectId && (
 <SubjectPage
 subjects={subjects}
 setSubjects={setSubjects}
 subjectId={selectedSubjectId}
 onStartExam={handleStartExam}
 onBackToDashboard={handleReturnToDashboard}
 />
 )}

 {screen === 'exam' && selectedSubjectId && selectedUnitIndex !== null && (
 <ExamScreen
 subjects={subjects}
 setSubjects={setSubjects}
 subjectId={selectedSubjectId}
 unitIndex={selectedUnitIndex}
 onExamSubmit={handleExamSubmit}
 onBackToDashboard={handleReturnToDashboard}
 timerEnabled={timerEnabled}
 timerDuration={timerDuration}
 examTimer={examTimer}
 setExamTimer={setExamTimer}
 passMarkPercent={passMarkPercent}
 />
 )}

 {screen === 'results' && selectedSubjectId && selectedUnitIndex !== null && (
 <ResultsPage
 subjects={subjects}
 setSubjects={setSubjects}
 subjectId={selectedSubjectId}
 unitIndex={selectedUnitIndex}
 onBackToDashboard={handleReturnToDashboard}
 onRetryUnit={() => {
 setExamMode(true)
 setScreen('exam')
 }}
 xpGained={lastXPGained}
 passMarkPercent={passMarkPercent}
 />
 )}

 {screen === 'settings' && (
 <Settings
 passMarkPercent={passMarkPercent}
 onPassMarkChange={setPassMarkPercent}
 subjects={subjects}
 onClearAllData={() => {
 setSubjects([])
 setPracticeLibrary([])
 setScreen('dashboard')
 }}
 onBackToDashboard={handleReturnToDashboard}
 />
 )}

 {screen === 'practice' && (
 <PracticeLab
 practiceLibrary={practiceLibrary}
 setPracticeLibrary={setPracticeLibrary}
 groqApiKey={groqApiKey}
 onBackToDashboard={handleReturnToDashboard}
 />
 )}
 </div>
 )
}
