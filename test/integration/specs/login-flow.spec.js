'use strict'

const assert = require('assert')

const { zip } = require('../utils')
const suite = require('../runtime')
const { login } = require('../fixtures')

const WebSocket = require('ws')

const { PORT } = process.env


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

const runConnection = (messages, timeout = 500) => {
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

suite('Login flow', test => {
	test('A new player can login', () =>
		runConnection(login('Fluttershy'), 500)
			.then(events => {
				assert.deepEqual(events, [{
					type: 'login-response',
					payload: {
						nickname: 'Fluttershy',
					},
				}])
			})
	)

	test('Two players can login', () =>
		Promise
			.all([
				runConnection(login('Fluttershy'), 500),
				runConnection(login('Rainbow Dash'), 500),
			])
			.then(players => {
				zip(['Fluttershy', 'Rainbow Dash'], players)
					.forEach(([nickname, events]) => {
						const event = events.find(({ type }) => type === 'login-response')
						assert.ok(event != null)
						assert.deepEqual(event.payload, { nickname })
					})
			})
	)
}).runWithServer(PORT)
