'use strict'

const assert = require('assert')

const { zip } = require('../utils')
const suite = require('../runtime')
const { login } = require('../fixtures')

const { PORT } = process.env


suite('Login flow', test => {
	test('A new player can login', t =>
		t.run(login('Fluttershy'), 500)
			.then(events => {
				assert.deepEqual(events, [{
					type: 'login-response',
					payload: {
						nickname: 'Fluttershy',
					},
				}])
			})
	)

	test('Two players can login', t =>
		Promise
			.all([
				t.run(login('Fluttershy'), 500),
				t.run(login('Rainbow Dash'), 500),
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
