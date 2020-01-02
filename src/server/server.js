'use strict'
const express = require('express')
const { Server } = require('ws')

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

server.on('connection', socket => {
	connected.push(socket)

	socket.on('message', message => {
		const { type, payload } = JSON.parse(message)
		messageHandlers[type](socket, payload)
	})

	socket.on('close', () => {
		connected.splice(connected.indexOf(socket), 1)
		messageHandlers.logout(socket, { nickname: socket.nickname })
	})
})

const messageHandlers = {
	login: (socket, { nickname }) => {
		socket.nickname = nickname
		socket.send(JSON.stringify({
			type: 'login-response',
			payload: { nickname }
		}))
		broadcast(newPlayer(nickname), [ socket ])
	},
	logout: (socket, { nickname }) => {
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

// Messages
const newPlayer = nickname => ({
	type: 'new-player',
	payload: { nickname },
})

const disconnectedPlayer = nickname => ({
	type: 'disconnected-player',
	payload: { nickname },
})
  



/*
  const connected = []
  
  server.on('connection', socket => {
	let nickname = ''
  
	socket.on('message', message => {
	  console.log(`Message received: ${message}`)
	  const data = JSON.parse(message)
	  if (data.type === 'open-connection') {
		nickname = data.nickname
		socket.send(JSON.stringify({
		  type: 'welcome',
		  message: `Welcome to the chat, ${nickname}`
		}))
		connected.push(nickname)
		broadcast(JSON.stringify({
		  type: 'participants',
		  participants: connected
		}))
	  }
	  broadcast(message, [ socket ])
	})
  
	socket.on('close', () => {
	  connected.splice(connected.indexOf(nickname), 1)
	  broadcast(JSON.stringify({
		type: 'close-connection',
		nickname,
	  }))
	  broadcast(JSON.stringify({
		type: 'participants',
		participants: connected
	  }))
	})
  })
 */ 
