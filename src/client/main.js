'use strict'
const socket = new WebSocket(`ws://${window.location.hostname}:${window.location.port}`)

socket.addEventListener('open', () => {
	console.log('Websocket opened')
	socket.send(JSON.stringify({
		type: 'login',
		payload: {
			nickname: `Mr Potato-${Date.now()}`,
		}
	}))
	console.log(socket)
})

const message_handlers = {
	'login-response': ({ nickname }) => console.log('login-response:', nickname),
	'new-player': ({ nickname }) => console.log('new-player:', nickname),
	'disconnected-player': ({ nickname }) => console.log('disconnected-player:', nickname),
}

socket.addEventListener('message', event => {
	console.log(`Message received: ${event.data}`)
	const { type, payload } = JSON.parse(event.data)
	message_handlers[type](payload)
})

socket.addEventListener('close', () => {
	console.log('¡¡oY')
})



const SIZE = 15
const HEIGHT = 35 * SIZE
const WIDTH = 50 * SIZE