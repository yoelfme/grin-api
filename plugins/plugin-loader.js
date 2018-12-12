const _ = require('lodash')
const bucker = require('bucker')
const requireDir = require('require-dir')

const logger = bucker.createLogger({ name: '/lib/plugin-loader' })

const defaultOptions = {}

const getPlugins = (plugins, options) => {
  const pluginFiles = Object.keys(plugins)

  return pluginFiles.reduce((acc, pluginFilename) => {
    const plugin = plugins[pluginFilename]

    // now verify if the plugin has the 'register' property, that means that is a plugin
    // if doesn't have the register property means that is an object that contains plugins
    if (plugin.register) {
      let pluginOptions = {}
      if (options.pluginOptions && options.pluginOptions[plugin.name]) {
        pluginOptions = options.pluginOptions[plugin.name]
      }

      return acc.concat([{ plugin, options: pluginOptions }])
    }

    return acc.concat(getPlugins(plugin, options))
  }, [])
}

const getPluginsFromPaths = (paths, options) => _(paths)
  .flatMap((path) => {
    const pathPlugins = requireDir(path, { recurse: true })

    return getPlugins(pathPlugins, options)
  })
  .value()

const registerPlugin = async (server, plugin, options) => {
  try {
    logger.info(`Registering plugin: ${plugin.name}`)
    await server.register({ plugin, options })
  } catch (error) {
    logger.warn(
      `An error has been ocurred trying to register the plugin: ${plugin.name}`,
    )
    throw error
  }
}

module.exports = {
  register: async (server, opts) => {
    const settings = _.defaults(opts, defaultOptions)

    // build array with every plugins need to register
    const plugins = getPluginsFromPaths(opts.paths, settings)
    const registration = _(plugins)
      .map(({ plugin, options }) => registerPlugin(server, plugin, options))
      .value()

    try {
      await Promise.all(registration)
    } catch (err) {
      logger.error(err)

      throw new Error(err)
    }
  },
  name: 'plugins-loader',
}
