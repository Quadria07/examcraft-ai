import mongoose from 'mongoose'

const questionSchema = new mongoose.Schema({
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
  difficulty: {
    type: String,
    default: 'medium',
  },
  bloomLevel: {
    type: String,
    default: 'Remember',
  },
  explanation: {
    type: String,
    default: '',
  },
  unitId: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
})

const Question = mongoose.models.Question || mongoose.model('Question', questionSchema)
export default Question
