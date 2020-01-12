'use strict'

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

const { exists } = require('./utils')

const readDir = promisify(fs.readdir)


const [ FILE ] = process.argv.slice(2)

const SPECS_FOLDER = path.resolve(__dirname, 'specs')


const main = () => generateFileList(FILE)
	.then(runTestSuites)
	.catch(error => {
		console.error(error)
		process.exit(1)
	})


// generateFileList

const generateFileList = file =>
	exists(file)
		? Promise.resolve([ file ])
		: readDir(SPECS_FOLDER)
			.then(filterSpecFiles)
			.then(prependDir(SPECS_FOLDER))

const filterSpecFiles = files =>
	files.filter(x =>
		x.match(/\.(spec|test).js$/)
	)

const prependDir = dir => files =>
	files.map(x =>
		path.join(dir, x)
	)


// runTestSuites

const runTestSuites = files => {
	files.forEach(file => {
		console.log(`\n> Running test suite ${file}\n`)
		const output = execFileSync('node', [ file ], {
			env: process.env,
		})
		console.log(output.toString())
	})
	return Promise.resolve()
}


main()
