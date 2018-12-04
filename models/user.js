const mongoose = require('mongoose')

const { Schema } = mongoose

const userSchema = new Schema(
  {
    email: String,
    username: String,
    hashedPassword: String,
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model('User', userSchema, 'users')
