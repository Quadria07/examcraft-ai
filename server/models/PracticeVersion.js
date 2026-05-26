import mongoose from 'mongoose'

const practiceVersionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  moduleId: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
})

const PracticeVersion = mongoose.models.PracticeVersion || mongoose.model('PracticeVersion', practiceVersionSchema)
export default PracticeVersion
