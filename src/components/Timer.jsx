import React from 'react'
import { formatTime } from '../utils/data'

export default function Timer({ seconds, isRunning }) {
 const isLowTime = seconds <= 300 // 5 minutes or less

 return (
 <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${
 isLowTime
 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
 : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
 }`}>
 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
 </svg>
 <span>{formatTime(seconds)}</span>
 </div>
 )
}
