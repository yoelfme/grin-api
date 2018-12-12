const bucker = require('bucker')
const gulp = require('gulp')
const nodemon = require('gulp-nodemon')

const logger = bucker.createLogger({ name: '/tasks/serve' })

gulp.task('serve', ['watch'], () => {
  nodemon({
    script: 'server',
    ext: 'html js',
    nodeArgs: ['--inspect'],
  }).on('start', () => {
    logger.info('Serve task has been started!')
  })
})
