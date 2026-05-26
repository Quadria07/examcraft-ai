import React, { useState, useEffect } from 'react'
import { useExamSession } from './hooks/useExamSession'
import Dashboard from './components/Dashboard'
import SubjectPage from './components/SubjectPage'
import ExamScreen from './components/ExamScreen'
import ResultsPage from './components/ResultsPage'
import Settings from './components/Settings'
import PracticeLab from './components/PracticeLab'
import AuthPage from './components/AuthPage'
import { useAuth } from './components/common/AuthContext'
import { fetchAppData, saveAppData, wipeAllData } from './utils/api'
import { createSubject } from './utils/data'
import Icons from './components/common/Icons'

export default function App() {
  const { user, loading: authLoading, logout } = useAuth()
  const [subjects, setSubjects] = useState([])
  const [practiceLibrary, setPracticeLibrary] = useState([])
  const [passMarkPercent, setPassMarkPercent] = useState(70)
  const [screen, setScreen] = useState('dashboard')
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(null)
  const [examMode, setExamMode] = useState(false)
  const [examTimer, setExamTimer] = useState(null)
  const [timerEnabled, setTimerEnabled] = useState(false)
  const [timerDuration, setTimerDuration] = useState(30)
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [lastXPGained, setLastXPGained] = useState(0)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [saveError, setSaveError] = useState(null)

  const { getExamSession, hasActiveSession, clearExamSession } = useExamSession()

  useEffect(() => {
    if (!user) {
      return
    }

    const checkSession = async () => {
      const session = await getExamSession()
      setShowResumeDialog(!!session)
    }

    checkSession()
  }, [user])

  useEffect(() => {
    if (!user) {
      return
    }

    const loadAppData = async () => {
      setDataLoaded(false)
      try {
        const response = await fetchAppData()
        setSubjects(response.data.subjects || [])
        setPracticeLibrary(response.data.practiceLibrary || [])
        setPassMarkPercent(response.data.passMarkPercent ?? 70)
      } catch (error) {
        console.error('Failed to load backend data:', error)
      } finally {
        setDataLoaded(true)
      }
    }

    loadAppData()
  }, [user])

  useEffect(() => {
    if (!user || !dataLoaded) {
      return
    }

    const timeout = setTimeout(async () => {
      setSaveStatus('saving')
      setSaveError(null)
      try {
        await saveAppData({ subjects, practiceLibrary, passMarkPercent })
        setSaveStatus('saved')
      } catch (error) {
        setSaveStatus('error')
        setSaveError(error.message || 'Failed to save progress')
        console.error('Save error:', error)
      }
    }, 700)

    return () => clearTimeout(timeout)
  }, [subjects, practiceLibrary, passMarkPercent, user, dataLoaded])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center text-gray-700">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-sm font-medium">Restoring your secure session…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center text-gray-700">
        <div className="text-center">
          <div className="mb-4 text-4xl">📚</div>
          <p className="text-sm font-medium">Loading your synced study library…</p>
        </div>
      </div>
    )
  }

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
      setExamTimer(timerDuration * 60)
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

  const handleResumeExam = async () => {
    const session = await getExamSession()
    if (session) {
      setSelectedSubjectId(session.subjectId)
      setSelectedUnitIndex(session.unitIndex)
      setExamMode(true)
      setScreen('exam')
      setExamTimer(session.timerSeconds)
      setShowResumeDialog(false)
    }
  }

  const handleDiscardExam = async () => {
    await clearExamSession()
    setShowResumeDialog(false)
  }

  const handleClearAllData = async () => {
    try {
      setSaveStatus('saving')
      await wipeAllData()
      setSubjects([])
      setPracticeLibrary([])
      setPassMarkPercent(70)
      setSaveStatus('saved')
      setScreen('dashboard')
    } catch (err) {
      console.error('Failed to wipe data:', err)
      setSaveStatus('error')
      alert('Failed to wipe system data: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Icons.Clipboard className="w-6 h-6 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-warmGray-400">Signed in as</p>
              <p className="text-sm font-bold text-gray-900">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saveStatus === 'saving' && (
              <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-2 text-xs font-semibold">Saving...</span>
            )}
            {saveStatus === 'error' && (
              <span className="rounded-full bg-red-100 text-red-700 px-3 py-2 text-xs font-semibold">Save failed</span>
            )}
            <button
              onClick={logout}
              className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-100 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {showResumeDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 border border-gray-100 transform transition-all">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Icons.Clipboard className="w-8 h-8 text-blue-600" />
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
          onClearAllData={handleClearAllData}
          onBackToDashboard={handleReturnToDashboard}
        />
      )}

      {screen === 'practice' && (
        <PracticeLab
          practiceLibrary={practiceLibrary}
          setPracticeLibrary={setPracticeLibrary}
          onBackToDashboard={handleReturnToDashboard}
        />
      )}
    </div>
  )
}
