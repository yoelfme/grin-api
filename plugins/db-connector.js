const bucker = require('bucker')
const joi = require('joi')
const mongoose = require('mongoose')

const validateSchema = joi.object().keys({
  host: joi.string().required(),
  port: joi.string().required(),
  database: joi.string().required(),
  debug: joi.boolean(),
})

module.exports = {
  register: (server, options) => {
    const validate = joi.validate(options, validateSchema)

    const logger = bucker.createLogger({
      name: '/plugins/db-connector',
      console: options.debug || false,
    })

    if (!validate.error) {
      const uri = `mongodb://${options.host}:${options.port}/${
        options.database
      }`
      logger.info(`Trying to connect to: ${uri}`)

      try {
        mongoose.connect(
          uri,
          { useCreateIndex: true, useNewUrlParser: true },
        )
        logger.info(`Successful connection to: ${uri}`)
      } catch (error) {
        logger.error(`Error trying to connect to: ${uri} with error ${error}`)
        throw error
      }
    } else {
      throw validate.error
    }
  },
  name: 'db',
}
