const Hapi = require('hapi')
const hapiPaginationPlugin = require('hapi-pagination')
const mongoose = require('mongoose')
const querystring = require('querystring')
const redis = require('yalo-cache-redis')
const sinon = require('sinon')
const auth = require('../../helpers/auth')
const config = require('../../config')
const userFixtures = require('../fixtures/users')
const { Place, User } = require('../../models')
const authPlugin = require('../../plugins/auth')
const dbConnector = require('../../plugins/db-connector')
const cache = require('../../plugins/cache')
const favoritesRoutes = require('../../routes/favorites')

let server = null
let jwt = null

const authSecret = config.get('/api/auth/secret')
const paginationConfig = config.get('/api/pagination')

beforeAll(async (done) => {
  server = Hapi.Server()

  const plugins = [
    {
      plugin: dbConnector,
      options: config.get('/api/db'),
    },
    {
      plugin: cache,
      options: config.get('/api/redis'),
    },
    {
      plugin: authPlugin,
      options: {
        secret: authSecret,
      },
    },
    {
      plugin: hapiPaginationPlugin,
      options: paginationConfig,
    },
    favoritesRoutes,
  ]

  await server.start()
  await server.register(plugins)

  done()
})

beforeEach(async (done) => {
  await User.insertMany(userFixtures)
  const user = await User.findOne({ username: 'duplicateduser' })
  jwt = auth.createSession(user)

  done()
})

afterEach(async (done) => {
  await Place.deleteMany({})
  await User.deleteMany({})

  done()
})

afterAll(async (done) => {
  await mongoose.disconnect()
  redis.stop()
  server.stop()

  done()
})

describe('add places', () => {
  test('should be abe able to return an error if place there is neither in our database nor Google Places', async () => {
    const placeId = 'ChIJ1RhNBET_0YURCdkz4j2Bqt0_'
    const request = {
      method: 'POST',
      url: `/favorites/${placeId}`,
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    }

    sinon.spy(Place, 'findOne')

    const { result, statusCode } = await server.inject(request)

    expect(statusCode).toBe(404)
    expect(result.error).toBe('Not Found')

    Place.findOne.restore()
  })

  test('should be abe able to create the place and add to the favorites in the user', async () => {
    const placeId = 'ChIJ1RhNBET_0YURCdkz4j2Bqt0'
    const request = {
      method: 'POST',
      url: `/favorites/${placeId}`,
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    }

    sinon.spy(Place, 'create')
    sinon.spy(Place, 'findOne')
    sinon.spy(User, 'findOneAndUpdate')

    const { result, statusCode } = await server.inject(request)

    expect(statusCode).toBe(201)
    expect(result.name).toBe('El Pescadito')

    const {
      args: [data],
    } = Place.create.getCall(0)

    // Because it's the first time that we are adding a favorite place with that id we are going to
    // create the place first, and then we are going to add it to the user favorite places
    expect(Place.create.calledOnce).toBe(true)
    expect(data).toEqual(expect.objectContaining({ placeId }))

    Place.findOne.restore()
    Place.create.restore()
    User.findOneAndUpdate.restore()
  })

  test('should be able to find if the place already exists and just add to the user', async () => {
    const placeName = 'My Own Place'
    const placeId = 'ChIJ1RhNBET_0YURCdkz4j2Bqt0'

    await Place.create({
      placeId,
      name: placeName,
      location: {
        type: 'Point',
        coordinates: [-99.168093, 19.411982],
      },
    })

    const request = {
      method: 'POST',
      url: `/favorites/${placeId}`,
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    }

    sinon.spy(Place, 'create')
    sinon.spy(Place, 'findOne')
    sinon.spy(User, 'findOneAndUpdate')

    const { result, statusCode } = await server.inject(request)

    expect(statusCode).toBe(201)
    expect(result.name).toBe(placeName)

    const {
      args: [data],
    } = Place.findOne.getCall(0)

    // Because we already have the place in the collection we don't need to create it,
    // that means that we are not going to call the create function in Place model,
    // but we are going to find the place
    expect(Place.create.notCalled).toBe(true)
    expect(Place.findOne.calledOnce).toBe(true)
    expect(User.findOneAndUpdate.calledOnce).toBe(true)
    expect(data).toEqual(expect.objectContaining({ placeId }))

    Place.findOne.restore()
    Place.create.restore()
    User.findOneAndUpdate.restore()
  })

  test('should be able to reject if the user already has added the place to his favorites', async () => {
    const placeName = 'My Own Place'
    const placeId = 'ChIJ1RhNBET_0YURCdkz4j2Bqt0'
    await Place.create({
      placeId,
      name: placeName,
      location: {
        type: 'Point',
        coordinates: [-99.168093, 19.411982],
      },
    })

    const request = {
      method: 'POST',
      url: `/favorites/${placeId}`,
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    }

    await server.inject(request)

    sinon.spy(Place, 'create')
    sinon.spy(Place, 'findOne')
    sinon.spy(User, 'findOneAndUpdate')

    const { result, statusCode } = await server.inject(request)

    expect(statusCode).toBe(409)
    expect(result.error).toBe('Conflict')
    expect(Place.create.notCalled).toBe(true)
    expect(Place.findOne.calledOnce).toBe(true)
    expect(User.findOneAndUpdate.calledOnce).toBe(true)

    Place.findOne.restore()
    Place.create.restore()
    User.findOneAndUpdate.restore()
  })
})

describe('delete places', () => {
  test('should be able to remove a place from the user favorite places', async () => {
    // Manually we are going to create the place and add to the user favorites, in order to
    // call the delete endpoint
    const placeName = 'My Own Place'
    const placeId = 'ChIJ1RhNBET_0YURCdkz4j2Bqt0'
    const place = await Place.create({
      placeId,
      name: placeName,
      location: {
        type: 'Point',
        coordinates: [-99.168093, 19.411982],
      },
    })

    await User.findOneAndUpdate(
      {
        username: 'duplicateduser',
      },
      {
        $push: { favorite_places: place },
      },
    )

    const request = {
      method: 'DELETE',
      url: `/favorites/${placeId}`,
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    }

    sinon.spy(User, 'findOneAndUpdate')

    const { statusCode } = await server.inject(request)

    expect(statusCode).toBe(204)
    expect(User.findOneAndUpdate.calledOnce).toBe(true)

    User.findOneAndUpdate.restore()
  })

  test('should be able to return a not found if the place does not exists in our places', async () => {
    const placeId = 'invalid_place_id'

    const request = {
      method: 'DELETE',
      url: `/favorites/${placeId}`,
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    }

    sinon.spy(Place, 'findOne')

    const { result, statusCode } = await server.inject(request)

    expect(statusCode).toBe(404)
    expect(result.error).toBe('Not Found')
    expect(Place.findOne.calledOnce).toBe(true)

    Place.findOne.restore()
  })

  test('should be able to return not found even if the place exists in our places, but not in the user favorites', async () => {
    // Manually we are going to create the place and add to the user favorites, in order to
    // call the delete endpoint
    const placeName = 'My Own Place'
    const placeId = 'ChIJ1RhNBET_0YURCdkz4j2Bqt0'
    await Place.create({
      placeId,
      name: placeName,
      location: {
        type: 'Point',
        coordinates: [-99.168093, 19.411982],
      },
    })

    const request = {
      method: 'DELETE',
      url: `/favorites/${placeId}`,
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    }

    sinon.spy(Place, 'findOne')

    const { result, statusCode } = await server.inject(request)

    expect(statusCode).toBe(404)
    expect(result.error).toBe('Not Found')
    expect(Place.findOne.calledOnce).toBe(true)

    Place.findOne.restore()
  })
})

describe('list favorites places', () => {
  beforeEach(async (done) => {
    const data = [
      {
        rating: 4.5,
        placeId: 'ChIJ2W3j7T__0YUR6bPUD39XMzA',
        categories: [
          'restaurant',
          'point_of_interest',
          'food',
          'establishment',
        ],
        name: 'El Pescadito Roma',
        location: {
          type: 'Point',
          coordinates: [-99.1670142, 19.4092662],
        },
      },
      {
        rating: 4.8,
        placeId: 'ChIJ1RhNBET_0YURCdkz4j2Bqt0',
        categories: [
          'restaurant',
          'point_of_interest',
          'food',
          'establishment',
        ],
        name: 'El Pescadito',
        location: {
          type: 'Point',
          coordinates: [-99.1734486, 19.414296],
        },
      },
      {
        rating: 4.6,
        placeId: 'ChIJuyih3jX_0YURvdnxZXmx4fM',
        categories: [
          'restaurant',
          'point_of_interest',
          'food',
          'establishment',
        ],
        name: 'El Pescadito',
        location: {
          type: 'Point',
          coordinates: [-99.1661436, 19.4261312],
        },
      },
    ]

    const places = (await Place.insertMany(data)).map(place => place.id)

    await User.findOneAndUpdate(
      {
        username: 'duplicateduser',
      },
      {
        $push: { favorite_places: places },
      },
    )

    done()
  })

  test('shoud be able to reject if the user sort by distance and does not share his location', async () => {
    const query = {
      sortby: 'distance',
    }

    const request = {
      method: 'GET',
      url: `/favorites?${querystring.stringify(query)}`,
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    }

    const { result, statusCode } = await server.inject(request)

    expect(statusCode).toBe(400)
    expect(result.error).toBe('Bad Request')
  })

  test('should be able to return the favorites places of a user sorted by distance', async () => {
    const query = {
      sortby: 'distance',
      lat: 19.411982,
      lon: -99.168093,
    }

    const request = {
      method: 'GET',
      url: `/favorites?${querystring.stringify(query)}`,
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    }

    const { result, statusCode } = await server.inject(request)

    expect(statusCode).toBe(200)
    expect(result).toHaveProperty('meta')
    expect(result).toHaveProperty('results')
    expect(result.results).toHaveLength(3)
    expect(result.results[0].place_id).toBe('ChIJ2W3j7T__0YUR6bPUD39XMzA')
  })

  test('should be able to return the favorites places of a user sorted by rating', async () => {
    const query = {
      sortby: 'rating',
    }

    const request = {
      method: 'GET',
      url: `/favorites?${querystring.stringify(query)}`,
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    }

    const { result, statusCode } = await server.inject(request)

    expect(statusCode).toBe(200)
    expect(result).toHaveProperty('meta')
    expect(result).toHaveProperty('results')
    expect(result.results).toHaveLength(3)
    expect(result.results[0].place_id).toBe('ChIJ1RhNBET_0YURCdkz4j2Bqt0')
  })

  test('should be able to return the favorites places of a user sorted by added date', async () => {
    const query = {
      sortby: 'added',
    }

    // We need to wait at leat one second to have a different createdAt date in our collection,
    // to validate that we are sorting by date
    const placeId = 'ChIJuyih3jX_0YURvdnxZXmx4fM00'
    const placeName = 'El Pescadito late'
    const placeData = {
      rating: 4.6,
      placeId,
      categories: ['restaurant', 'point_of_interest', 'food', 'establishment'],
      name: placeName,
      location: {
        type: 'Point',
        coordinates: [-99.1661436, 19.4261312],
      },
    }

    const place = await Place.create(placeData)

    await User.findOneAndUpdate(
      {
        username: 'duplicateduser',
      },
      {
        $push: { favorite_places: place.id },
      },
    )

    const request = {
      method: 'GET',
      url: `/favorites?${querystring.stringify(query)}`,
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    }

    const { result, statusCode } = await server.inject(request)

    expect(statusCode).toBe(200)
    expect(result).toHaveProperty('meta')
    expect(result).toHaveProperty('results')
    expect(result.results).toHaveLength(4)
    expect(result.results[0].place_id).toBe(placeId)
    expect(result.results[0].name).toBe(placeName)
  })
})
