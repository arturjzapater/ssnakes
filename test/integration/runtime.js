'use strict'

const { fork } = require('child_process')
const path = require('path')

const { delay } = require('./utils')

const DEFAULT_TIMEOUT = 5000


const runWithTimeout = (fn, timeout) =>
	new Promise((resolve, reject) => {
		const t = setTimeout(() => {
			// TODO: this should cancel the running test as well.
			reject(`Test didn't finish after ${timeout} ms`)
		}, timeout)
		fn()
			.then(data => {
				clearTimeout(t)
				resolve(data)
			})
	})

const makeSuite = (description, fn) => {
	const cases = []

	const test = (description, fn) => {
		const run = () => runWithTimeout(fn, DEFAULT_TIMEOUT)
			.then(fn)
			.then(() => {
				console.log(`\n\x1b[32m * OK   - ${description}\x1b[0m`)
			})
			.catch(error => {
				console.log(`\n\x1b[31m * FAIL - ${description}`)
				console.log(error)
				console.log('\x1b[0m')
			})
		cases.push(run)
	}

	const runSerial = () => {
		console.log(description)
		return cases.reduce(
			(prev, t) => prev
				.then(t)
				.catch(t),
			Promise.resolve()
		)
	}

	const runWithServer = (PORT) => {
		const server = fork(path.resolve(__dirname, '..', '..', 'src', 'server', 'server.js'), [], {
			detached: true,
			env: { PORT },
		})
		server.on('error', error => {
			console.log('Error', error)
			server.kill()
		})
		delay(500)()
			.then(runSerial)
			.then(() => {
				server.kill()
			})
	}
	
	fn(test)
	
	return {
		runSerial,
		runWithServer,
	}
}

module.exports = makeSuite
