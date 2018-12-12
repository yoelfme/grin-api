const mongoose = require('mongoose')

const { Schema } = mongoose

const pointSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
})

const place = new Schema(
  {
    placeId: String,
    rating: {
      type: Number,
      default: 0,
    },
    name: String,
    categories: [String],
    location: {
      type: pointSchema,
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

place.index({ location: '2dsphere' })

module.exports = mongoose.model('Place', place, 'places')
