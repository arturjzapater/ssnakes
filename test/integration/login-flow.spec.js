'use strict'

const assert = require('assert')
const { fork } = require('child_process')
const path = require('path')

const {
	delay,
	tryCatch,
	zip,
} = require('./utils')

const { login } = require('./fixtures')

const WebSocket = require('ws')

const { PORT } = process.env


const test = (description, fn) => () =>
	Promise.resolve()
		.then(fn)
		.then(() => {
			console.log(`\n\x1b[32m * OK   - ${description}\x1b[0m`)
		})
		.catch(error => {
			console.log(`\n\x1b[31m * FAIL - ${description}`)
			console.log(error)
			console.log('\x1b[0m')
		})

const TEST_TIMEOUT = 2000

const main = () => {
	const server = fork(path.resolve(__dirname, '..', '..', 'src', 'server', 'server.js'), [], {
		detached: true,
		env: { PORT },
	})
	server.on('error', error => {
		console.log('Error', error)
		server.kill()
	})
	delay(500) ()
		.then(runTests)
		.then(() => {
			server.kill()
		})
}

const openConnection = () => new Promise((resolve, reject) => {
	const ws = new WebSocket(`ws://localhost:${PORT}`)
	ws.onopen = () => {
		resolve(ws)
	}
	ws.onerror = error => {
		ws.close()
		reject(error)
	}
})

const runConnection = (messages, timeout = TEST_TIMEOUT) => {
	const messagesList = Array.isArray(messages)
		? messages
		: [ messages ]
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

const runSerial = tests =>
	tests.reduce(
		(prev, t) => prev
			.then(t)
			.catch(t),
		Promise.resolve()
	)

const runTests = () => runSerial([
	test('A new player can login', () =>
		new Promise((resolve, reject) => {
			const ws = new WebSocket(`ws://localhost:${PORT}`)
			ws.onopen = () => {
				console.log('Connected to server')
				ws.send(login('Fluttershy'))
			}
			ws.onmessage = event => {
				const { type, payload } = JSON.parse(event.data)
				// This needs to be done because `assert.*` functions throw errors
				// when something is not equal, but since this a callback sent to ws.onmessage
				// the exception will not be wrapped normally within the promise.
				tryCatch(() => {
					assert.strictEqual(type, 'login-response')
					assert.deepEqual(payload, {
						nickname: 'Fluttershy',
					})
				})
				.then(() => {
					ws.close()
					resolve()
				})
				.catch(reject)
			}
			ws.onclose = () => {
				console.log('Connection terminated')
			}
			ws.onerror = error => {
				ws.close()
				reject(error)
			}
		})
	),
	test('Two players can login', () =>
		Promise
			.all([
				runConnection(login('Fluttershy'), 500),
				runConnection(login('Rainbow Dash'), 500),
			])
			.then(players => {
				zip([ 'Fluttershy', 'Rainbow Dash' ], players)
					.forEach(([ nickname, events ]) => {
						const event = events.find(({ type }) => type === 'login-response')	
						assert.ok(event != null)
						assert.deepEqual(event.payload, { nickname })
					})
			})
	),
])

main()

