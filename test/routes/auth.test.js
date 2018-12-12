const Hapi = require('hapi')
const JWT = require('jsonwebtoken')
const mongoose = require('mongoose')
const redis = require('yalo-cache-redis')
const config = require('../../config')
const auth = require('../../plugins/auth')
const authRoutes = require('../../routes/auth')
const dbConnector = require('../../plugins/db-connector')
const cache = require('../../plugins/cache')
const User = require('../../models/user')
const userFixtures = require('../fixtures/users')

let server = null

const authSecret = config.get('/api/auth/secret')

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
      plugin: auth,
      options: {
        secret: authSecret,
      },
    },
    authRoutes,
  ]

  await server.start()
  await server.register(plugins)

  done()
})

beforeEach(async (done) => {
  await User.insertMany(userFixtures)
  done()
})

afterEach(async (done) => {
  await User.deleteMany({})
  done()
})

afterAll(async (done) => {
  redis.stop()
  server.stop()

  mongoose.disconnect(done)
})

describe('register user', () => {
  test('should be able to validate the incoming payload', async () => {
    const payload = {
      email: 'an-invalid-email',
      username: 'Yoel Monzon',
      password: 'my-strong-password',
      passwordConfirm: 'my-strong-password',
    }

    const request = {
      method: 'POST',
      url: '/auth/register',
      payload,
    }

    const { result, statusCode } = await server.inject(request)

    expect(statusCode).toBe(400)
    expect(result).toHaveProperty('error', 'Bad Request')
    expect(result).toHaveProperty('message', 'Invalid request payload input')
  })

  test('should be able to register a new user', async () => {
    const payload = {
      email: 'jhon.doe@gmail.com',
      username: 'jhondoe2018',
      password: 'MyPassword2018',
      passwordConfirm: 'MyPassword2018',
    }

    const request = {
      method: 'POST',
      url: '/auth/register',
      payload,
    }

    const { result, statusCode } = await server.inject(request)

    expect(statusCode).toBe(201)
    expect(result).toHaveProperty('jwt')
  })

  test('should be able to validate that we do not duplicate users', async () => {
    const payload = {
      email: 'jhon.doe@gmail.com',
      username: 'duplicateduser',
      password: 'MyPassword2018',
      passwordConfirm: 'MyPassword2018',
    }

    const request = {
      method: 'POST',
      url: '/auth/register',
      payload,
    }

    const { result, statusCode } = await server.inject(request)

    expect(statusCode).toBe(409)
    expect(result).toHaveProperty('error', 'Conflict')
  })
})

describe('login user', () => {
  test('should be able to reject with a bad request if payload is invalid', async () => {
    const payload = {
      email: 'an-invalid-email',
      password: 'my-strong-password',
    }

    const request = {
      method: 'POST',
      url: '/auth/login',
      payload,
    }

    const { result, statusCode } = await server.inject(request)

    expect(statusCode).toBe(400)
    expect(result).toHaveProperty('error', 'Bad Request')
    expect(result).toHaveProperty('message', 'Invalid request payload input')
  })

  test('should be able to login and create a new session for an user', async () => {
    const payload = {
      username: 'duplicateduser',
      password: 'myStrongPassword',
    }

    const request = {
      method: 'POST',
      url: '/auth/login',
      payload,
    }

    const { result, statusCode } = await server.inject(request)

    expect(statusCode).toBe(200)
    expect(result).toHaveProperty('jwt')
  })

  test('should be able to deal with a user with invalid credentials', async () => {
    const payload = {
      username: 'duplicateduser',
      password: 'myInvalidPassword',
    }

    const request = {
      method: 'POST',
      url: '/auth/login',
      payload,
    }

    const { result, statusCode } = await server.inject(request)

    expect(statusCode).toBe(401)
    expect(result).toHaveProperty('error', 'Unauthorized')
  })
})

describe('logout  user', () => {
  test('should be able to reject malformed jwt', async () => {
    const logout = {
      method: 'POST',
      url: '/auth/logout',
      headers: {
        authorization: 'Bearer my.invalid.jwt',
      },
    }

    const { result, statusCode } = await server.inject(logout)

    expect(statusCode).toBe(401)
    expect(result).toHaveProperty('error', 'Unauthorized')
  })

  test('should be able to reject an invalid jwt', async () => {
    const token = JWT.sign({ id: '123', valid: true }, authSecret)
    const logout = {
      method: 'POST',
      url: '/auth/logout',
      headers: {
        authorization: `Bearer ${token}`,
      },
    }

    const { result, statusCode } = await server.inject(logout)

    expect(statusCode).toBe(401)
    expect(result).toHaveProperty('error', 'Unauthorized')
  })

  test('should be able to log out and deactivate the session of a user', async () => {
    // First of all, we need to log in the user to get an JWT and create the session in Redis
    const payload = {
      username: 'duplicateduser',
      password: 'myStrongPassword',
    }

    const login = {
      method: 'POST',
      url: '/auth/login',
      payload,
    }

    const {
      result: { jwt },
    } = await server.inject(login)

    const logout = {
      method: 'POST',
      url: '/auth/logout',
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    }

    const { statusCode } = await server.inject(logout)

    expect(statusCode).toBe(200)
  })
})
