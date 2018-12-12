const confidence = require('confidence')
const inert = require('inert')
const vision = require('vision')
const hapiSwagger = require('hapi-swagger')
const hapiPaginationPlugin = require('hapi-pagination')
const config = require('./config')

const filter = {
  env: process.env.APP_ENV,
}

const manifest = {
  $meta: 'Configuration used to start the API Server',
  server: {
    debug: {
      request: ['error'],
    },
    port: config.get('/server/port'),
    routes: {
      cors: true,
    },
  },
  register: {
    plugins: [
      {
        plugin: './plugins/auth',
        options: {
          secret: config.get('/api/auth/secret'),
        },
      },
      {
        plugin: './plugins/db-connector',
        options: config.get('/api/db'),
      },
      {
        plugin: './plugins/cache',
        options: {
          host: config.get('/api/redis/host', filter),
          port: config.get('/api/redis/port', filter),
          partition: config.get('/api/redis/partition', filter),
        },
      },
      {
        plugin: hapiPaginationPlugin,
        options: config.get('/api/pagination'),
      },
      inert,
      vision,
      {
        plugin: hapiSwagger,
        options: {
          basePath: '/',
          documentationPath: '/',
          info: config.get('/documentation'),
        },
      },
      {
        plugin: './plugins/plugin-loader',
        options: {
          paths: ['../routes'],
        },
      },
    ],
  },
}

const store = new confidence.Store(manifest)

module.exports = {
  get: key => store.get(key, filter),
  meta: key => store.meta(key, filter),
}
