import convict = require('convict')
import * as fs from 'fs'

const config = convict({
	companion: {
		host: {
			default: '127.0.0.1',
		},
		port: {
			default: 16622,
		},
	},
	companionBackup: {
		host: {
			default: '127.0.0.1',
		},
		port: {
			default: 16622,
		},
	},
	rest: {
		port: {
			default: 9999,
		},
	},
})

export function loadConig(): typeof config {
	if (process.env.CONFIG) {
		//TODO: dose this work
		console.log('loading env CONFIG')
		config.loadFile(process.env.CONFIG)
	} else if (fs.existsSync('./config/user.json')) {
		console.log('loading user CONFIG')
		config.loadFile('./config/user.json')
	}
	return config
}

export function saveConfig(conf: typeof config): void {
	fs.writeFile('./config/user.json', conf.toString(), 'utf-8', (err) => console.log(err))
}
