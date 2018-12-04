const authJWT = require('hapi-auth-jwt2')
const redis = require('yalo-cache-redis')

const validate = async (decoded) => {
  try {
    const session = await redis.get('users', decoded.id)

    if (session && session.valid) {
      return { isValid: true, credentials: { session } }
    }

    return { isValid: false }
  } catch (error) {
    return { isValid: false }
  }
}

module.exports = {
  register: async (server, options) => {
    await server.register(authJWT)

    server.auth.strategy('jwt', 'jwt', {
      key: options.secret,
      validate,
      verifyOptions: { algorithms: ['HS256'] },
    })

    server.auth.default('jwt')
  },
  name: 'auth',
}
