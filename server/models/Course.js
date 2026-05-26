import mongoose from 'mongoose'

const courseSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
})

const Course = mongoose.models.Course || mongoose.model('Course', courseSchema)
export default Course
