'use strict'
const express = require('express')
const { Server } = require('ws')

const {
	disconnectedPlayer,
	gameStart,
    loginError,
    loginResponse,
    newPlayer,
} = require('./messages')

const { PORT } = process.env

const app = express()

app.use(express.static('src/client'))

const listener = app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`)
})
  
const server = new Server({
	server: listener,
})

const connected = []
let gameStarted = false

server.on('connection', socket => {
	connected.push(socket)

	const send = message => {
		const data = typeof message === 'string'
			? message
			: JSON.stringify(message)
		socket.send(data)
	}

	socket.on('message', message => {
		const { type, payload } = JSON.parse(message)
		messageHandlers[type](socket, send, payload)
	})

	socket.on('close', () => {
		connected.splice(connected.indexOf(socket), 1)
		messageHandlers.logout(socket, send, { nickname: socket.nickname })
	})
})

const messageHandlers = {
	login: (socket, send, { nickname }) => {
		if (connected.find(socket => socket.nickname === nickname)) {
			send(loginError('Nickname already taken'))
			return
		}

		socket.nickname = nickname
		socket.player = connected.length <= 2
		send(loginResponse(nickname))
		broadcast(newPlayer(nickname), [ socket ])

		if (connected.length >= 2 && !gameStarted) {
			const players = connected
				.filter(x => x.player)
				.map(x => x.nickname)
			broadcast(gameStart(Date.now(), players))
			gameStarted = true
		}
	},
	logout: (socket, send, { nickname }) => {
		broadcast(disconnectedPlayer(nickname))
	}
}

const broadcast = (message, exclude = []) => {
	const data = typeof message === 'string' ? message : JSON.stringify(message)
	server.clients.forEach(client => {
		if (exclude.includes(client)) return
		client.send(data)
	})
}
