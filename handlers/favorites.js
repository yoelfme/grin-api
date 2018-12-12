const boom = require('boom')
const bucker = require('bucker')
const { Place, User } = require('../models')
const {
  getPlaceById,
  transfromFromGoogleToDB,
  transfromFromDBToUser,
  placesFromDBToUser,
} = require('../helpers/places')

const logger = bucker.createLogger({ name: '/handlers/favorites' })

/*
This handler has 4 steps, although eventually it does not necessarily have to fulfill the 4 steps.

The steps are:
  1) Validate if we already have the place in our database
  2) Try to get the place from Google Places API based on its id
  3) if we found the place:
    3.1) if user doesn't have the place added to his favorites, then add it
    3.2) if user already has trhe place added to his favorites, return conflict
  4) if we didn't find the place, return not found
*/
const add = async (request, h) => {
  const { placeId } = request.params

  try {
    let place = null
    logger.info(`Finding the place with id: ${placeId} in our places`)
    const savedPlace = await Place.findOne({ placeId })

    if (savedPlace) {
      logger.info(`The place with id: ${placeId} already exists in our places`)
      place = savedPlace
    } else {
      const data = await getPlaceById(placeId)

      if (!data) {
        return boom.notFound()
      }

      logger.info(`Creating a new place with the id: ${placeId}`)
      place = await Place.create(transfromFromGoogleToDB(data))
    }

    const { session } = request.auth.credentials

    logger.info(
      `Adding the place with id: ${placeId} to the user with the id: ${
        session.userId
      }`,
    )

    const user = await User.findOneAndUpdate(
      {
        _id: session.userId,
        favorite_places: {
          $ne: place.id,
        },
      },
      {
        $push: { favorite_places: place },
      },
      {
        new: true,
      },
    )

    if (!user) {
      return boom.conflict()
    }

    return (
      h
        // eslint-disable-next-line no-underscore-dangle
        .response(transfromFromDBToUser(place))
        .code(201)
    )
  } catch (error) {
    logger.error(error)
    throw boom.boomify(error)
  }
}

const remove = async (request, h) => {
  const { placeId } = request.params
  const { session } = request.auth.credentials

  try {
    logger.info(`Finding the place with id: ${placeId} in our places`)
    const place = await Place.findOne({ placeId })

    if (!place) {
      return boom.notFound()
    }

    const user = await User.findOneAndUpdate(
      {
        _id: session.userId,
        favorite_places: place.id,
      },
      {
        $pull: { favorite_places: place.id },
      },
      {
        new: true,
      },
    )

    if (!user) {
      return boom.notFound()
    }

    return h.response().code(204)
  } catch (error) {
    logger.error(error)
    throw boom.boomify(error)
  }
}

const getQuery = {
  distance: ({ lat, lon }) => ({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        $maxDistance: 5000,
      },
    },
  }),
  default: () => ({}),
}

const getSortOptions = {
  rating: () => ({
    sort: { rating: -1 },
  }),
  added: () => ({
    sort: { createdAt: -1 },
  }),
  default: () => ({}),
}

const list = async (request, h) => {
  const {
    sortby, lat, lon, page, limit,
  } = request.query
  const { session } = request.auth.credentials

  const query = getQuery[sortby]
    ? getQuery[sortby]({ lat, lon })
    : getQuery.default()
  const sortOptions = getSortOptions[sortby]
    ? getSortOptions[sortby]()
    : getSortOptions.default()

  const user = await User.findById(session.userId)
    .populate({
      path: 'favorite_places',
      match: query,
      options: sortOptions,
    })
    .exec()

  const totalCount = user.favorite_places.length
  const offset = (page - 1) * limit

  const places = placesFromDBToUser(
    user.favorite_places.slice(offset, offset + limit),
    { lat, lon },
  )

  return h.response({
    results: places,
    totalCount,
  })
}

module.exports = {
  add,
  remove,
  list,
}
