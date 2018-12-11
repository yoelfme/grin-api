const boom = require('boom')
const bucker = require('bucker')
const redis = require('yalo-cache-redis')
const { getNearbyPlaces, sanitizePlaces } = require('../helpers/places')
const { getRequestId } = require('../helpers/utils')

const logger = bucker.createLogger({ name: '/handlers/search' })

/*
This handler has 3 steps, although eventually it does not necessarily have to fulfill the 3 steps.

The steps are:
  1) Validate if the user has already made a request with the same query
  2) Validate if the user is asking for the next page of results
  3) Ask to Google API for places based on the query or the nextPageToken
*/
const search = async (request, h) => {
  const {
    lat, lon, text, sortby, page = 1,
  } = request.query
  let query = {
    lat,
    lon,
    text,
    sortby,
  }

  try {
    const requestId = getRequestId({ ...query })

    // Validate if the user has already made a request with the same query
    const cachedData = await redis.get(requestId, `${page}`)

    if (cachedData) {
      return h.response({
        results: cachedData.places,
        hasNext: !!cachedData.nextPageToken,
        hasPrevious: page > 1,
        hasLimit: false,
      })
    }

    // Validate if the user is asking for the next page of results
    const nextPageTokenKey = `${requestId}-token`
    const cachedNextPageToken = await redis.get(nextPageTokenKey, `${page}`)

    if (cachedNextPageToken) {
      query = { ...query, pagetoken: cachedNextPageToken }
    }

    // Ask to Google API for places based on the query
    const { nextPageToken, places } = await getNearbyPlaces(query)
    const results = sanitizePlaces({ lat, lon }, places)

    if (nextPageToken) {
      // if we receive a nextPageToken that means that Google has more records of our query, so
      // we are going to save the token in cache if the user ask for the next page
      await redis.set(`${requestId}-token`, `${page + 1}`, nextPageToken)
    }

    await redis.set(requestId, `${page}`, { nextPageToken, places: results })

    return h.response({
      results,
      hasNext: !!nextPageToken,
      hasPrevious: page > 1,
      hasLimit: false,
    })
  } catch (error) {
    logger.error(error)
    throw boom.boomify(error)
  }
}

module.exports = {
  search,
}
