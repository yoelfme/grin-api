const joi = require('joi')
const { add, remove, list } = require('../handlers/favorites')

module.exports = {
  register: (server) => {
    server.route({
      method: 'POST',
      path: '/favorites/{placeId}',
      options: {
        auth: 'jwt',
        description: 'Add a new place to our favorite places',
        notes:
          'Add a place to our list of favorites based on his Google Places ID',
        tags: ['api', 'favorites'],
        validate: {
          params: {
            placeId: joi.string().required(),
          },
        },
      },
      handler: add,
    })

    server.route({
      method: 'DELETE',
      path: '/favorites/{placeId}',
      options: {
        auth: 'jwt',
        description: 'Remove a place from favorite places of a user',
        notes:
          'Remove a place from the user list of favorites places bases in his place id',
        tags: ['api', 'favorites'],
        validate: {
          params: {
            placeId: joi.string().required(),
          },
        },
      },
      handler: remove,
    })

    server.route({
      method: 'GET',
      path: '/favorites',
      options: {
        auth: 'jwt',
        description: 'List all favorites places of the user',
        notes: `List all the places that the user has added to his favorite places,
          and also the user can sort by distance, rating or added date`,
        validate: {
          query: {
            sortby: joi
              .string()
              .valid(['distance', 'rating', 'added'])
              .default('added'),
            lat: joi
              .number()
              .when('sortby', { is: 'distance', then: joi.required() }),
            lon: joi
              .number()
              .when('sortby', { is: 'distance', then: joi.required() }),
          },
        },
      },
      handler: list,
    })
  },
  name: 'favorites-routes',
}
