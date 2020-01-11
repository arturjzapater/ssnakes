const assert = require('assert')
const { fork } = require('child_process')
const path = require('path')

const WebSocket = require('ws')

const { PORT } = process.env


const test = (description, fn) =>
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

const delay = ms => data => new Promise(resolve => {
	setTimeout(() => resolve(data), ms)
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

const testWs = (description, fn) =>
	test(description, () => new Promise((resolve, reject) => {
		const ws = new WebSocket(`ws://localhost:${PORT}`)
		ws.onopen = () => {
			fn(ws)
				.then(resolve)
				.catch(reject)
		}
		ws.onerror = error => {
			ws.close()
			reject(error)
		}
	}))

const openConnection = () => new Promise((resolve, reject) => {
	const ws = new WebSocket(`ws://localhost:${PORT}`)
	ws.onopen = () => {
		resolve(ws)
	}
	ws.onerror = error => {
		reject(error)
	}
})

const assertLogin = nickname =>
	openConnection()
		.then(ws => new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(`No message received after ${TEST_TIMEOUT} ms`)
			}, TEST_TIMEOUT)
			ws.onmessage = event => {
				clearTimeout(timeout)
				const { type, payload } = JSON.parse(event.data)
				assert.strictEqual(type, 'login-response')
				assert.deepEqual(payload, { nickname })
				ws.close()
				resolve(ws)
			}
			ws.send(login(nickname))
		}))

const runTests = () => Promise.all([
	test('A new player can login', () =>
		new Promise((resolve, reject) => {
			const ws = new WebSocket(`ws://localhost:${PORT}`)
			ws.onopen = () => {
				console.log('Connected to server')
				ws.send(login('Fluttershy'))
			}
			ws.onmessage = event => {
				const { type, payload } = JSON.parse(event.data)
				assert.strictEqual(type, 'login-response')
				assert.deepEqual(payload, {
					nickname: 'Fluttershy',
				})
				ws.close()
				resolve()
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
		Promise.all([
			assertLogin('Fluttershy'),
			Promise.resolve('Rainbow Dash')
				.then(delay(200))
				.then(assertLogin),
		])
	),
])

main()

// Messages

const login = nickname => JSON.stringify({
	type: 'login',
	payload: { nickname },
})
