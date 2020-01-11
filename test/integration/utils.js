module.exports.delay = ms => data => new Promise(resolve => {
	setTimeout(() => resolve(data), ms)
})

module.exports.tryCatch = fn => {
	try {
		const result = fn()
		return Promise.resolve(result)
	} catch (error) {
		return Promise.reject(error)
	}
}

module.exports.zip = (a, b) =>
	a.map((x, i) => [x, b[i]])
