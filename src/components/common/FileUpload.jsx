import React, { useState, useRef } from 'react'
import Icons from './Icons'
import { parseFileContent } from '../../utils/fileParser'

export default function FileUpload({ onFileParsed, loading: parentLoading }) {
 const [dragActive, setDragActive] = useState(false)
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState('')
 const inputRef = useRef(null)

 const handleFile = async (file) => {
 if (!file) return
 
 setLoading(true)
 setError('')
 
 try {
 const text = await parseFileContent(file)
 if (text.trim().length < 100) {
 throw new Error('The file content is too short to be processed.')
 }
 onFileParsed(text, file.name)
 } catch (err) {
 setError(err.message || 'Failed to process file.')
 } finally {
 setLoading(false)
 }
 }

 const handleDrag = (e) => {
 e.preventDefault()
 e.stopPropagation()
 if (e.type === 'dragenter' || e.type === 'dragover') {
 setDragActive(true)
 } else if (e.type === 'dragleave') {
 setDragActive(false)
 }
 }

 const handleDrop = (e) => {
 e.preventDefault()
 e.stopPropagation()
 setDragActive(false)
 if (e.dataTransfer.files && e.dataTransfer.files[0]) {
 handleFile(e.dataTransfer.files[0])
 }
 }

 const handleChange = (e) => {
 e.preventDefault()
 if (e.target.files && e.target.files[0]) {
 handleFile(e.target.files[0])
 }
 }

 return (
 <div className="w-full">
 <div 
 className={`relative group rounded-xl border-4 border-dashed transition-all duration-500 overflow-hidden ${
 dragActive 
 ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.02] ' 
 : 'border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/20'
 }`}
 onDragEnter={handleDrag}
 onDragLeave={handleDrag}
 onDragOver={handleDrag}
 onDrop={handleDrop}
 >
 <input
 ref={inputRef}
 type="file"
 className="hidden"
 accept=".pdf,.docx,.txt"
 onChange={handleChange}
 />

 <div className="p-12 flex flex-col items-center text-center">
 <div className={`w-24 h-24 rounded-3xl mb-8 flex items-center justify-center transition-all duration-500 ${
 dragActive ? 'bg-blue-600 scale-110 rotate-6 ' : 'bg-white dark:bg-gray-800'
 }`}>
 {loading || parentLoading ? (
 <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
 ) : (
 <Icons.Clipboard className={`w-10 h-10 ${dragActive ? 'text-white' : 'text-blue-500'}`} />
 )}
 </div>

 <div className="space-y-3 mb-8">
 <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
 {dragActive ? 'Drop it here' : 'Upload Your Material'}
 </h3>
 <p className="text-sm font-medium text-gray-400 dark:text-gray-500 max-w-xs mx-auto">
 Drag and drop your PDF, DOCX, or text files here.
 </p>
 </div>

 <button
 onClick={() => inputRef.current.click()}
 disabled={loading || parentLoading}
 className="px-10 py-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-100 dark:border-gray-700 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 dark:"
 >
 Choose File
 </button>

 <div className="mt-10 flex items-center gap-6 opacity-30 grayscale hover:grayscale-0 transition-all duration-500 group-hover:opacity-60">
 <div className="flex flex-col items-center gap-1">
 <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 font-black text-[10px]">PDF</div>
 </div>
 <div className="flex flex-col items-center gap-1">
 <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-black text-[10px]">DOCX</div>
 </div>
 <div className="flex flex-col items-center gap-1">
 <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 font-black text-[10px]">TXT</div>
 </div>
 </div>
 </div>
 </div>

 {error && (
 <div className="mt-6 p-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-900/30 rounded-2xl flex items-start gap-4 animation-fade-in ">
 <Icons.X className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
 <div className="space-y-1">
 <p className="text-xs font-black uppercase tracking-widest text-red-600">Upload Failed</p>
                 <p className="text-sm text-red-800 dark:text-red-200/80 font-medium leading-relaxed">
                  The system encountered an issue processing your curriculum material. Please verify the file and try again.
                </p>

 </div>
 </div>
 )}
 </div>
 )
}
