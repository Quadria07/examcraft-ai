import mongoose from 'mongoose'

const practiceQuestionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    default: null,
  },
  answer: {
    type: String,
    required: true,
  },
  explanation: {
    type: String,
    default: '',
  },
  sourceQuote: {
    type: String,
    default: '',
  },
  confidence: {
    type: Number,
    default: 1.0,
  },
  versionId: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
})

const PracticeQuestion = mongoose.models.PracticeQuestion || mongoose.model('PracticeQuestion', practiceQuestionSchema)
export default PracticeQuestion
