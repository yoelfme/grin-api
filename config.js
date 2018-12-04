const Confidence = require('confidence')

const config = {
  $meta: 'This file defines all configuration for the API',
  projectName: 'api',
  server: {
    port: process.env.APP_PORT || 3000,
  },
  api: {
    db: {
      host: {
        $filter: 'env',
        $default: '127.0.0.1',
        test: process.env.APP_DB_HOST || '127.0.0.1',
        staging: process.env.APP_DB_HOST,
        production: process.env.APP_DB_HOST,
      },
      port: {
        $filter: 'env',
        $default: '127.0.0.1',
        test: process.env.APP_DB_PORT || '27017',
        staging: process.env.APP_DB_PORT,
        production: process.env.APP_DB_PORT,
      },
      database: {
        $filter: 'env',
        $default: 'api',
        test: 'api-test',
        staging: process.env.APP_DB_DATABASE,
        production: process.env.APP_DB_DATABASE,
      },
      debug: true,
    },
    redis: {
      host: {
        $filter: 'env',
        $default: '127.0.0.1',
        test: process.env.REDIS_HOST,
        local: process.env.REDIS_HOST,
        staging: process.env.REDIS_HOST,
        production: process.env.REDIS_HOST,
      },
      port: {
        $filter: 'env',
        $default: 6379,
        local: process.env.REDIS_PORT || 6379,
        test: process.env.REDIS_PORT || 6379,
        staging: process.env.REDIS_PORT,
        production: process.env.REDIS_PORT,
      },
      partition: {
        $filter: 'env',
        $default: 'api',
        test: process.env.REDIS_PARTITION || 'api',
        local: process.env.REDIS_PARTITION || 'api',
        staging: process.env.REDIS_PARTITION,
        production: process.env.REDIS_PARTITION,
      },
    },
    auth: {
      secret: {
        $filter: 'env',
        $default: '127.0.0.1',
        test: process.env.AUTH_SECRET || 'MyVeryStrongSecret',
        local: process.env.AUTH_SECRET,
        staging: process.env.AUTH_SECRET,
        production: process.env.AUTH_SECRET,
      },
    },
    env: process.env.APP_ENV,
  },
}

const store = new Confidence.Store(config)

module.exports = {
  get: (key, criteria = { env: process.env.APP_ENV }) => store.get(key, criteria),
  meta: (key, criteria = { env: process.env.APP_ENV }) => store.meta(key, criteria),
}
