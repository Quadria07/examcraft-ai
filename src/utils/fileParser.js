import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'

// Set worker for pdfjs-dist using the bundled worker via Vite's ?url import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

/**
 * Extracts raw text from a PDF file.
 * @param {File} file 
 * @returns {Promise<string>}
 */
export const extractTextFromPDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let fullText = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map((item) => item.str).join(' ')
    fullText += pageText + '\n\n'
  }

  return fullText.trim()
}

/**
 * Extracts raw text from a DOCX file.
 * @param {File} file 
 * @returns {Promise<string>}
 */
export const extractTextFromDOCX = async (file) => {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value.trim()
}

/**
 * General purpose file parser.
 * @param {File} file 
 * @returns {Promise<string>}
 */
export const parseFileContent = async (file) => {
  const extension = file.name.split('.').pop().toLowerCase()
  
  if (extension === 'pdf') {
    return await extractTextFromPDF(file)
  } else if (extension === 'docx') {
    return await extractTextFromDOCX(file)
  } else if (extension === 'txt') {
    return await file.text()
  } else {
    throw new Error('Unsupported file format. Please upload PDF, DOCX, or TXT.')
  }
}
