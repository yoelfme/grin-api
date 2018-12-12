const Hapi = require('hapi')
const mongoose = require('mongoose')
const hapiPaginationPlugin = require('hapi-pagination')
const querystring = require('querystring')
const redis = require('yalo-cache-redis')
const rp = require('request-promise')
const sinon = require('sinon')
const auth = require('../../helpers/auth')
const { getRequestId } = require('../../helpers/utils')
const config = require('../../config')
const userFixtures = require('../fixtures/users')
const User = require('../../models/user')
const authPlugin = require('../../plugins/auth')
const dbConnector = require('../../plugins/db-connector')
const cache = require('../../plugins/cache')
const searchRoutes = require('../../routes/search')

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
    searchRoutes,
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
  await User.deleteMany({})
  done()
})

afterAll(async (done) => {
  await mongoose.disconnect()
  redis.stop()
  server.stop()
  done()
})

describe('search places', () => {
  test('should be able to validate incoming query', async () => {
    const query = 'text=my-favorite-place'

    const request = {
      method: 'GET',
      url: `/search?${query}`,
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    }

    const { statusCode } = await server.inject(request)

    expect(statusCode).toBe(400)
  })

  test('should be able to get places near to location and filter by text with pagination', async () => {
    const query = {
      lat: 19.411982,
      lon: -99.168093,
      text: 'el pescadito',
      sortby: 'distance',
    }

    const requestId = getRequestId(query)

    const request = {
      method: 'GET',
      url: `/search?${querystring.stringify(query)}`,
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    }

    // We are goig to spy that we get and set data in Redis and we call the Google API
    sinon.spy(redis, 'get')
    sinon.spy(redis, 'set')
    sinon.spy(rp, 'get')

    const { result, statusCode } = await server.inject(request)

    await redis.delete(requestId, '1')
    await redis.delete(`${requestId}-token`, '2')

    expect(statusCode).toBe(200)
    expect(result).toHaveProperty('meta')
    expect(result.meta.next).toBeNull()
    expect(result.meta.previous).toBeNull()
    expect(result).toHaveProperty('results')
    expect(result.meta).toEqual(expect.any(Object))
    expect(result.results).toEqual(expect.any(Array))

    // Becase we dont have data saved in cache we expect that we called 3 times redis.get,
    // one time redis.set and one time the Google API without an nextPageToken,
    // but why 3 times redis.get because first we need to validate the JWT that add one call
    // to redis because we saved the sessions in Redis
    const {
      args: [, options],
    } = rp.get.getCall(0)

    expect(redis.get.calledThrice).toBe(true)
    expect(redis.set.calledOnce).toBe(true)
    expect(rp.get.calledOnce).toBe(true)
    expect(rp.get.calledAfter(redis.get)).toBe(true)
    expect(redis.set.calledAfter(rp.get)).toBe(true)
    expect(options.qs).toEqual(
      expect.not.objectContaining({ page_token: null }),
    )

    redis.get.restore()
    redis.set.restore()
    rp.get.restore()
  })

  test('should be able to search places to Google Places using next page token before saved', async () => {
    const query = {
      lat: -33.866,
      lon: 151.196,
    }

    const request = {
      method: 'GET',
      url: `/search?${querystring.stringify(query)}`,
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    }

    const requestId = getRequestId(query)

    const { result } = await server.inject(request)

    expect(result).toHaveProperty('meta')
    expect(result.meta.next).not.toBeNull()

    // We are going to wait for 2 seconds to give time to Google to valid the nextPageToken
    await new Promise(resolve => setTimeout(resolve, 2000))

    const nextUrl = new URL(result.meta.next)
    const url = `${nextUrl.pathname}${nextUrl.search}`

    const request2 = {
      method: 'GET',
      url,
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    }

    // Now after the first request, we have a nextPageToken, so we are goig to spy that we get
    // and set data in Redis and we call the Google API with the nextPageToken
    sinon.spy(redis, 'get')
    sinon.spy(redis, 'set')
    sinon.spy(rp, 'get')

    const { result: result2, statusCode } = await server.inject(request2)

    expect(statusCode).toBe(200)
    expect(result2).toHaveProperty('meta')
    expect(result2.meta.next).not.toBeNull()
    expect(result2.meta.previous).not.toBeNull()
    expect(result2).toHaveProperty('results')
    expect(result2.meta).toEqual(expect.any(Object))
    expect(result2.results).toEqual(expect.any(Array))
    expect(result2.results).toHaveLength(20)

    const nextPage2Token = await redis.get(`${requestId}-token`, '2')

    // Becase we dont have data saved in cache we expect that we called 3 times redis.get,
    // 2 times redis.set and one time the Google API without an nextPageToken,
    // but why 3 times redis.get because first we need to validate the JWT that add one call
    // to redis because we saved the sessions in Redis
    const {
      args: [, options],
    } = rp.get.getCall(0)

    expect(redis.get.callCount).toBe(4)
    expect(redis.set.calledTwice).toBe(true)
    expect(rp.get.calledOnce).toBe(true)
    expect(rp.get.calledAfter(redis.get)).toBe(true)
    expect(redis.set.calledAfter(rp.get)).toBe(true)
    expect(options.qs).toEqual(
      expect.objectContaining({ pagetoken: nextPage2Token }),
    )
    expect(options.qs).toEqual(expect.not.objectContaining({ text: null }))

    redis.get.restore()
    redis.set.restore()
    rp.get.restore()

    await redis.delete(requestId, '1')
    await redis.delete(requestId, '2')
    await redis.delete(`${requestId}-token`, '2')
    await redis.delete(`${requestId}-token`, '3')
  })
})
