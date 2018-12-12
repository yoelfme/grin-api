const mongoose = require('mongoose')

const { Schema } = mongoose

const userSchema = new Schema(
  {
    email: {
      type: String,
      unique: true,
    },
    username: String,
    hashedPassword: String,
    favorite_places: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Place',
      },
    ],
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model('User', userSchema, 'users')
