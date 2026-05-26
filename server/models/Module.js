import mongoose from 'mongoose'

const moduleSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  courseId: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
})

const Module = mongoose.models.Module || mongoose.model('Module', moduleSchema)
export default Module
