'use strict'

const newPlayer = nickname => ({
	type: 'new-player',
	payload: { nickname },
})

const disconnectedPlayer = nickname => ({
	type: 'disconnected-player',
	payload: { nickname },
})

const loginError = message => ({
	type: 'login-error',
	payload: { message },
})

const loginResponse = nickname => ({
	type: 'login-response',
	payload: { nickname },
})

const gameStart = (timestamp, players) => ({
    type: 'game-start',
    payload: {
        timestamp,
        players,
    },
})

module.exports = {
    disconnectedPlayer,
    loginError,
    loginResponse,
    newPlayer,
    gameStart,
}
