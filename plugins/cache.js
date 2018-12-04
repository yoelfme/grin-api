const redis = require('yalo-cache-redis')
const bucker = require('bucker')
const config = require('../config')

const logger = bucker.createLogger({
  ...config.get('/logger/options'),
  name: '/handlers/proxy',
})

module.exports = {
  register: async (server, options) => {
    const { host, port, partition } = options

    await redis.start({
      debug: true,
      redis: {
        host,
        port,
        partition,
      },
    })

    logger.info(
      `Redis has been started in ${host}:${port} with partition: ${partition}`,
    )
  },
  name: 'cache',
}
