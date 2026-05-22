import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  data: {
    subjects: {
      type: Array,
      default: [],
    },
    practiceLibrary: {
      type: Array,
      default: [],
    },
    passMarkPercent: {
      type: Number,
      default: 70,
    },
    activeExamSession: {
      type: Object,
      default: null,
    },
    settings: {
      type: Object,
      default: {},
    },
  },
}, {
  timestamps: true,
})

userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.passwordHash
  return obj
}

const User = mongoose.models.User || mongoose.model('User', userSchema)
export default User
