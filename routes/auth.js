const joi = require('joi')
const { register, login, logout } = require('../handlers/auth')

module.exports = {
  register: (server) => {
    server.route({
      method: 'POST',
      path: '/auth/register',
      options: {
        auth: false,
        description: 'Register a new user',
        notes:
          'Create a new user but first validate if is unique and then returns a new JWT for the new user',
        tags: ['api', 'auth'],
        validate: {
          payload: joi.object().keys({
            email: joi
              .string()
              .email()
              .required(),
            username: joi
              .string()
              .alphanum()
              .min(3)
              .max(30)
              .required(),
            password: joi.string().regex(/^[a-zA-Z0-9]{3,30}$/),
            passwordConfirm: joi
              .any()
              .only(joi.ref('password'))
              .required()
              .options({ language: { allowOnly: 'must match password' } }),
          }),
        },
      },
      handler: register,
    })

    server.route({
      method: 'POST',
      path: '/auth/login',
      options: {
        auth: false,
        description: 'Login user',
        notes: 'Authenticate a user with his username or email',
        tags: ['api', 'auth'],
        validate: {
          payload: joi
            .object()
            .keys({
              email: joi.string().email(),
              username: joi
                .string()
                .alphanum()
                .min(3)
                .max(30),
              password: joi
                .string()
                .regex(/^[a-zA-Z0-9]{3,30}$/)
                .required(),
            })
            .xor('email', 'username'),
          // This means that they don't have to appear together but where one of them is required
        },
      },
      handler: login,
    })

    server.route({
      method: 'POST',
      path: '/auth/logout',
      options: {
        auth: 'jwt',
        description: 'Logout user',
        notes:
          'Logout a user means that we are going to invalidate his session',
        tags: ['api', 'auth'],
        validate: {
          headers: joi
            .object({
              authorization: joi.string().required(),
            })
            .options({ allowUnknown: true }),
        },
      },
      handler: logout,
    })
  },
  name: 'auth-routes',
}
