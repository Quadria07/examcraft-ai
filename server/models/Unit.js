import mongoose from 'mongoose'

const unitSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  material: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    default: 'locked',
  },
  bestScore: {
    type: Number,
    default: null,
  },
  subjectId: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
})

const Unit = mongoose.models.Unit || mongoose.model('Unit', unitSchema)
export default Unit
