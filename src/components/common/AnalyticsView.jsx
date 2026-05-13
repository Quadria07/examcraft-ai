import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area
} from 'recharts'
import Icons from './Icons'

export default function AnalyticsView({ subjects }) {
  // Aggregate all history across subjects
  const allHistory = subjects.flatMap(s => (s.stats?.history || []).map(h => ({
    ...h,
    subjectName: s.name,
    timestamp: new Date(h.timestamp).getTime()
  }))).sort((a, b) => a.timestamp - b.timestamp)

  const chartData = allHistory.map(h => ({
    name: h.unitTitle,
    score: h.score,
    date: new Date(h.timestamp).toLocaleDateString()
  }))

  const totalXP = subjects.reduce((acc, s) => acc + (s.stats?.xp || 0), 0)
  const totalSolved = subjects.reduce((acc, s) => acc + (s.stats?.totalQuestionsSolved || 0), 0)
  const averageMastery = subjects.length > 0 
    ? Math.round(subjects.reduce((acc, s) => {
        const units = s.units || []
        const passed = units.filter(u => u.status === 'passed').length
        return acc + (units.length > 0 ? (passed / units.length) * 100 : 0)
      }, 0) / subjects.length) 
    : 0

  return (
    <div className="space-y-12 animation-fade-in">
      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-xl border border-primary/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] font-black uppercase tracking-widest text-warmGray-400 mb-4">Mastery Experience</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-gray-900 tracking-tighter">{totalXP.toLocaleString()}</span>
            <span className="text-sm font-black text-primary uppercase">XP</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-xl border border-primary/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] font-black uppercase tracking-widest text-warmGray-400 mb-4">Curriculum Solved</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-gray-900 tracking-tighter">{totalSolved.toLocaleString()}</span>
            <span className="text-sm font-black text-tertiary uppercase">Units</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-xl border border-primary/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] font-black uppercase tracking-widest text-warmGray-400 mb-4">Aggregate Progress</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-gray-900 tracking-tighter">{averageMastery}%</span>
            <span className="text-sm font-black text-warmGray-300 uppercase italic font-serif">Mastery</span>
          </div>
        </div>
      </div>

      {/* Main progress chart */}
      <div className="bg-white p-10 rounded-xl border border-primary/5">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase">Academic Trend</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-warmGray-400">Historical assessment performance</p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/5 rounded-full border border-primary/10">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Score Velocity</span>
            </div>
          </div>
        </div>

        <div className="h-[400px] w-full min-h-[400px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2e7d32" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#9ca3af' }} 
                  dy={10}
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#9ca3af' }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid rgba(46,125,50,0.1)', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                    fontSize: '10px',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    backgroundColor: '#fffcf5'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#2e7d32" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-center p-12 bg-cream rounded-xl border border-primary/5">
              <Icons.Clipboard className="w-12 h-12 text-warmGray-200 mb-4" />
              <p className="text-[10px] font-black text-warmGray-400 uppercase tracking-widest">No Academic History</p>
              <p className="text-xs text-warmGray-500 mt-2 font-serif italic">Complete your first assessment to visualize growth.</p>
            </div>
          )}
        </div>
      </div>

      {/* Badges and Subjects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Badges (5 columns) */}
        <div className="lg:col-span-5 bg-white p-10 rounded-xl border border-primary/5">
          <h3 className="text-xl font-black text-gray-900 mb-8 tracking-tighter uppercase italic">Distinctions</h3>
          <div className="grid grid-cols-3 gap-6">
            {['streak_3', 'level_5', 'perfect_score', 'first_blood'].map((badge) => {
              const isEarned = subjects.some(s => s.stats?.badges?.includes(badge))
              const badgeInfo = {
                streak_3: { icon: Icons.Clock, label: 'Early Bird', bg: 'bg-tertiary/5', text: 'text-tertiary' },
                level_5: { icon: Icons.Award, label: 'Rising Star', bg: 'bg-primary/5', text: 'text-primary' },
                perfect_score: { icon: Icons.Check, label: 'Zen Master', bg: 'bg-primary/5', text: 'text-primary' },
                first_blood: { icon: Icons.Plus, label: 'Initiator', bg: 'bg-tertiary/5', text: 'text-tertiary' }
              }[badge] || { icon: Icons.Circle, label: 'Unknown', bg: 'bg-gray-50', text: 'text-gray-400' }

              return (
                <div key={badge} className={`flex flex-col items-center gap-3 group ${isEarned ? '' : 'opacity-20 grayscale'}`}>
                  <div className={`w-14 h-14 rounded-xl ${badgeInfo.bg} border border-primary/5 flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm`}>
                    <badgeInfo.icon className={`w-7 h-7 ${badgeInfo.text}`} />
                  </div>
                  <span className="text-[9px] font-black uppercase text-warmGray-400 text-center tracking-tighter leading-none">{badgeInfo.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Courses (7 columns) */}
        <div className="lg:col-span-7 bg-white p-10 rounded-xl border border-primary/5">
          <h3 className="text-xl font-black text-gray-900 mb-8 tracking-tighter uppercase">Course Mastery</h3>
          <div className="space-y-6">
            {subjects.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-cream rounded-xl border border-primary/5 group hover:border-primary/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white border border-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                    LV{s.stats?.level || 1}
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">{s.name}</p>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-warmGray-400">{s.stats?.streak || 0}-Day Streak</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-primary">{s.stats?.xp || 0}</span>
                  <p className="text-[8px] font-black uppercase tracking-widest text-warmGray-300">XP Earned</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
