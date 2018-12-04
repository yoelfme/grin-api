const aguid = require('aguid')
const JWT = require('jsonwebtoken')
const redis = require('yalo-cache-redis')
const config = require('../config')

const authSecret = config.get('/api/auth/secret')

const createSession = (user) => {
  const session = {
    valid: true,
    id: aguid(), // this generates a random id for the session
  }

  // eslint-disable-next-line no-underscore-dangle
  redis.set('users', session.id, { ...session, userId: user._id })

  return JWT.sign(session, authSecret)
}

const destroySession = (session) => {
  const invalidSession = {
    ...session,
    valid: false,
    ended: new Date().getTime(),
  }

  redis.set('users', session.id, invalidSession)
}

const getSessionId = request => JWT.decode(request.headers.authorization, authSecret)

module.exports = {
  createSession,
  getSessionId,
  destroySession,
}
