const getRequestId = (query) => {
  const keys = Object.keys(query)
  const value = keys
    .sort()
    .filter(key => !!query[key])
    .map(key => `${key}:${query[key]}`)
    .join(',')

  const id = Buffer.from(value).toString('base64')

  return `request-${id}`
}

module.exports = {
  getRequestId,
}
