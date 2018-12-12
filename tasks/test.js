const gulp = require('gulp')
const nodemon = require('gulp-nodemon')
const minimist = require('minimist')
const bucker = require('bucker')

const options = minimist(process.argv.slice(3))
const logger = bucker.createLogger({ name: '/tasks/test' })

gulp.task('test', ['watch'], () => {
  let exec = 'node_modules/jest/bin/jest.js --runInBand'

  if (options.pattern) {
    exec += ` ${options.pattern}`
  }

  nodemon({
    exec,
    ext: 'js',
    ignore: ['test/cassettes/*'],
  }).on('start', () => {
    logger.info('Testing task has been started!')
  })
})
