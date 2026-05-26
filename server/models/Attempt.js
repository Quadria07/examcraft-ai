import mongoose from 'mongoose'

const attemptSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  responses: {
    type: Map,
    of: String,
    default: {},
  },
  flagged: {
    type: Map,
    of: Boolean,
    default: {},
  },
  score: {
    type: Number,
    required: true,
  },
  percentage: {
    type: Number,
    required: true,
  },
  completed: {
    type: Boolean,
    default: true,
  },
  timeTaken: {
    type: Number,
    default: 0,
  },
  difficulty: {
    type: String,
    default: 'medium',
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  unitId: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
})

const Attempt = mongoose.models.Attempt || mongoose.model('Attempt', attemptSchema)
export default Attempt
