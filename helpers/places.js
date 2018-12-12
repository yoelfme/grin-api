const bucker = require('bucker')
const geolib = require('geolib')
const rp = require('request-promise')
const config = require('../config')

const { key: googleMapsKey, radius: searchRadius } = config.get(
  '/api/google/maps',
)
const logger = bucker.createLogger({ name: '/helpers/places' })

const getPlaceById = async (placeId) => {
  try {
    logger.info(`Finding a place with the id: ${placeId}`)

    const query = {
      placeid: placeId,
      fields: ['name', 'rating', 'types', 'geometry', 'place_id'].join(','),
      key: googleMapsKey,
    }

    const uri = 'https://maps.googleapis.com/maps/api/place/details/json'
    const { result: place } = await rp.get(uri, {
      qs: query,
      json: true,
    })

    if (place) {
      logger.info(`Place with the id: ${placeId} places has been found`)

      return place
    }

    logger.info(`Place with the id: ${placeId} does not exists`)

    return null
  } catch (error) {
    logger.error(
      `There was an error trying to find the place with the id: ${placeId}`,
    )
    logger.error(error)

    throw error
  }
}

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

const getDistanceFromUser = (user, place) => geolib.getDistance(user, place)

const trasnformFromGoogleToUser = (place) => {
  const {
    geometry: {
      location: { lat, lng },
    },
  } = place
  const location = { latitude: lat, longitude: lng }

  return {
    rating: place.rating || 0,
    place_id: place.place_id,
    categories: place.types,
    name: place.name,
    location,
  }
}

const transfromFromGoogleToDB = (place) => {
  const {
    geometry: {
      location: { lat, lng },
    },
  } = place

  return {
    rating: place.rating || 0,
    placeId: place.place_id,
    categories: place.types,
    name: place.name,
    location: {
      type: 'Point',
      coordinates: [lng, lat],
    },
  }
}

const transfromFromDBToUser = (place) => {
  const [pLon, pLat] = place.location.coordinates
  const location = {
    latitude: pLat,
    longitude: pLon,
  }

  return {
    rating: place.rating || 0,
    place_id: place.placeId,
    categories: place.categories,
    name: place.name,
    location,
    added_at: place.createdAt,
  }
}

const placesFromDBToUser = (places, { lat: latitude, lon: longitude }) => {
  let startLocation = null

  if (latitude && longitude) {
    startLocation = {
      latitude,
      longitude,
    }
  }

  return places.map((placeData) => {
    const place = transfromFromDBToUser(placeData)

    if (startLocation) {
      return {
        ...place,
        distance: getDistanceFromUser(startLocation, place.location),
      }
    }

    return place
  })
}

const placesFromGoogleToUser = ({ lat: latitude, lon: longitude }, places) => {
  const startLocation = {
    latitude,
    longitude,
  }

  return places.map((placeData) => {
    const place = trasnformFromGoogleToUser(placeData)

    return {
      ...place,
      distance: getDistanceFromUser(startLocation, place.location),
    }
  })
}

module.exports = {
  getPlaceById,
  getNearbyPlaces,
  placesFromGoogleToUser,
  placesFromDBToUser,
  trasnformFromGoogleToUser,
  transfromFromDBToUser,
  transfromFromGoogleToDB,
}
