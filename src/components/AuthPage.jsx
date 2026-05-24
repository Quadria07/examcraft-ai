import React, { useState } from 'react'
import { useAuth } from './common/AuthContext'
import Icons from './common/Icons'

export default function AuthPage() {
  const { login, register, error, setError } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'login') {
        await login(email.trim(), password)
      } else {
        await register(email.trim(), password, inviteCode.trim())
      }
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-primary/10 shadow-xl p-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black text-gray-900">ExamCraft AI</h1>
            <p className="text-sm text-warmGray-500 mt-2">Adaptive exam preparation for students, instructors, and institutions. Practice, assess, and track progress with AI-powered tools.</p>
          </div>
          <div className="rounded-2xl bg-primary/10 p-3">
            <Icons.ShieldCheck className="w-6 h-6 text-primary" />
          </div>
        </div>

        <div className="flex gap-2 mb-8">
          {['login', 'register'].map((tab) => (
            <button
              key={tab}
              onClick={() => setMode(tab)}
              className={`flex-1 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition ${mode === tab ? 'bg-primary text-cream' : 'bg-cream text-warmGray-400 hover:bg-primary/5'}`}
            >
              {tab === 'login' ? 'Login' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-warmGray-400">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="mt-2 w-full rounded-2xl border border-gray-200 px-5 py-4 text-sm font-medium text-gray-900 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-warmGray-400">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={8}
              className="mt-2 w-full rounded-2xl border border-gray-200 px-5 py-4 text-sm font-medium text-gray-900 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-warmGray-400">Invitation Code</label>
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                type="text"
                required
                className="mt-2 w-full rounded-2xl border border-gray-200 px-5 py-4 text-sm font-medium text-gray-900 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              />
            </div>
          )}

          {(error || message) && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
              {error || message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-primary px-6 py-4 text-sm font-black uppercase tracking-widest text-cream transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Working...' : mode === 'login' ? 'Open your ExamCraft dashboard' : 'Get started with ExamCraft'}
          </button>
        </form>
        {mode === 'login' ? (
          <p className="text-[10px] text-warmGray-400 mt-8">
            New to ExamCraft? <button type="button" onClick={() => setMode('register')} className="font-black text-primary">Create account</button>
          </p>
        ) : (
          <>
            <p className="text-sm text-warmGray-500 mt-6">
              Need instructor or institutional access? Contact ExamCraft AI to get onboarding and institutional plans: <a href="mailto:support@examcraft.ai" className="font-black text-primary">support@examcraft.ai</a>
            </p>

            <p className="text-[10px] text-warmGray-400 mt-6">
              Already registered? <button type="button" onClick={() => setMode('login')} className="font-black text-primary">Login instead</button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
