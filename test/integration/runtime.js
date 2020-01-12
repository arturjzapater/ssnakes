'use strict'

const { fork } = require('child_process')
const path = require('path')

const WebSocket = require('ws')

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
		const run = config => runWithTimeout(() => fn(config), DEFAULT_TIMEOUT)
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

	const runSerial = (config) => {
		console.log(description)
		return cases.reduce(
			(prev, t) => prev
				.then(() => t(config))
				.catch(() => t(config)),
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
		const open = openConnection(PORT)
		const run = runConnection(open)
		delay(500) ({ open, run })
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


const openConnection = port => () => new Promise((resolve, reject) => {
	const ws = new WebSocket(`ws://localhost:${port}`)
	ws.onopen = () => {
		resolve(ws)
	}
	ws.onerror = error => {
		ws.close()
		reject(error)
	}
})

const runConnection = openConnection => (messages, timeout = 500) => {
	const messagesList = Array.isArray(messages)
		? messages
		: [messages]
	return openConnection()
		.then(ws => new Promise((resolve, reject) => {
			const received = []
			setTimeout(() => {
				ws.close()
				resolve(received)
			}, timeout)
			ws.onmessage = event => {
				received.push(JSON.parse(event.data))
			}
			ws.onerror = reject
			messagesList.forEach(m => {
				ws.send(m)
			})
		}))
}
