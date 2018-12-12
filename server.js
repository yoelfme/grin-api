const bucker = require('bucker')
const serverComposer = require('./index')

const logger = bucker.createLogger({ name: '/server' })

const startServer = async () => {
  try {
    const server = await serverComposer()
    await server.start()
    logger.info('Server has been started')
  } catch (err) {
    logger.error(err)
    process.exit(1)
  }
}

startServer()
