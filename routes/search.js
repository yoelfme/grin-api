const Joi = require('joi')
const { search } = require('../handlers/search')

module.exports = {
  register: (server) => {
    server.route({
      method: 'GET',
      path: '/search',
      options: {
        auth: 'jwt',
        description: 'Search places near to user location',
        notes:
          'Search places in Google Places based on the user location and text',
        tags: ['api', 'search'],
        validate: {
          query: {
            text: Joi.string(),
            lat: Joi.number()
              .min(-90)
              .max(90)
              .required(),
            lon: Joi.number()
              .min(-180)
              .max(180)
              .required(),
            sortby: Joi.string().valid(['rating', 'distance']),
            page: Joi.number().min(1),
            limit: Joi.number().allow([20]),
          },
          headers: Joi.object({
            authorization: Joi.string().required(),
          }).options({ allowUnknown: true }),
        },
      },
      handler: search,
    })
  },
  name: 'search-routes',
}
