import mongoose from 'mongoose'

const practiceAttemptSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  score: {
    type: Number,
    required: true,
  },
  percentage: {
    type: Number,
    required: true,
  },
  responses: {
    type: Map,
    of: String,
    default: {},
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  versionId: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
})

const PracticeAttempt = mongoose.models.PracticeAttempt || mongoose.model('PracticeAttempt', practiceAttemptSchema)
export default PracticeAttempt
