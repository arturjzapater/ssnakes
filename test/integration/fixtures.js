module.exports.login = nickname => JSON.stringify({
	type: 'login',
	payload: { nickname },
})
