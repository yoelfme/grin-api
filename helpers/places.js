const bucker = require('bucker')
const geolib = require('geolib')
const rp = require('request-promise')
const config = require('../config')

const { key: googleMapsKey, radius: searchRadius } = config.get(
  '/api/google/maps',
)
const logger = bucker.createLogger({ name: '/helpers/places' })

const getNearbyPlaces = async ({
  lat, lon, text, sortby, pagetoken,
}) => {
  const query = {
    key: googleMapsKey,
  }

  if (pagetoken) {
    query.pagetoken = pagetoken
  } else {
    query.radius = searchRadius
    query.location = `${lat},${lon}`

    if (text) {
      query.name = text
    }

    if (sortby) {
      delete query.radius
      query.rankby = sortby
    }
  }

  try {
    logger.info('Finding places with query: %j', query)
    const uri = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json'
    const { next_page_token: nextPageToken, results: places } = await rp.get(
      uri,
      {
        qs: query,
        json: true,
      },
    )

    logger.info(`${places.length} places have been found`)

    return {
      nextPageToken,
      places,
    }
  } catch (error) {
    logger.error(
      'There was an error trying to find places with query: %j',
      query,
    )
    logger.error(error)

    throw error
  }
}

const getAllNearbyPlaces = async (query, allPlaces = []) => {
  const { nextPageToken, places } = await getNearbyPlaces(query)

  // eslint-disable-next-line no-param-reassign
  allPlaces = allPlaces.concat(places)

  if (nextPageToken) {
    return new Promise(resolve => setTimeout(resolve, 2000)).then(() => getAllNearbyPlaces(
      { ...query, pagetoken: nextPageToken },
      allPlaces,
    ))
  }

  return allPlaces
}

const sanitizePlaces = ({ lat: latitude, lon: longitude }, places) => {
  const startLocation = {
    latitude,
    longitude,
  }

  return places.map((place) => {
    const {
      geometry: {
        location: { lat, lng },
      },
    } = place
    const placeLocation = { latitude: lat, longitude: lng }
    const distance = geolib.getDistance(startLocation, placeLocation)

    return {
      distance,
      rating: place.rating || 0,
      id: place.id,
      category: place.types,
      name: place.name,
      location: placeLocation,
    }
  })
}

module.exports = {
  getNearbyPlaces,
  getAllNearbyPlaces,
  sanitizePlaces,
}
