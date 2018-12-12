const bucker = require('bucker')
const gulp = require('gulp')

const logger = bucker.createLogger({ name: '/name/watch' })

// outputs changes to files to the console
const reportChange = (event) => {
  logger.info(`File ${event.path} was ${event.type}, running tasks...`)
}

// this task wil watch for changes
// to js, html, and css files and call the
// reportChange method. Also, by depending on the
gulp.task('watch', () => {
  gulp.watch('.', ['build']).on('change', reportChange)
})
