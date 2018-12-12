const bcrypt = require('bcrypt')
const boom = require('boom')
const bucker = require('bucker')
const auth = require('../helpers/auth')
const { User } = require('../models')

const logger = bucker.createLogger({ name: '/handlers/auth' })

const register = async (request, h) => {
  const { payload: data } = request

  try {
    const exists = await User.findOne({
      $or: [{ email: data.email }, { username: data.username }],
    })

    if (exists) {
      logger.warn(
        `User with email: ${data.email} and username: ${
          data.username
        } already exists`,
      )
      return boom.conflict('User already exists')
    }

    logger.info(`Hashing password for user with email: ${data.email}`)
    const hashedPassword = await bcrypt.hash(data.password, 10)

    logger.info('Creating new user with data: %j', data)
    const user = await User.create({
      ...data,
      hashedPassword,
      favorite_places: [],
    })

    logger.info(`User with email: ${user.email} has been created`)

    const jwt = auth.createSession(user)

    return h
      .response({
        jwt,
      })
      .code(201)
  } catch (error) {
    logger.error(
      `An error has been ocurred trying to create the user with email: ${
        data.email
      }`,
    )
    logger.error(error)
    throw boom.boomify(error)
  }
}

const login = async (request) => {
  const { payload: data } = request
  const query = data.email
    ? { email: data.email }
    : { username: data.username }

  try {
    logger.info('Finding information about user: %j', query)
    const user = await User.findOne(query)

    if (!user) {
      return boom.unauthorized()
    }

    const match = await bcrypt.compare(data.password, user.hashedPassword)

    if (!match) {
      return boom.unauthorized()
    }

    logger.info('User has been found, and his credentials are valid')

    const jwt = auth.createSession(user)

    return { jwt }
  } catch (error) {
    logger.error(
      'An error has been ocurred trying to log in the user with info %j',
      query,
    )
    logger.error(error)
    throw boom.boomify(error)
  }
}

const logout = async (request) => {
  const { session } = request.auth.credentials
  try {
    await auth.destroySession(session)

    return {}
  } catch (error) {
    logger.error(
      `An error has been ocurred trying to log ut the user with session: ${session}`,
    )
    logger.error(error)
    throw boom.boomify(error)
  }
}

module.exports = {
  register,
  login,
  logout,
}
