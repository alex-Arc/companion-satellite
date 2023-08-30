import convict = require('convict')
import * as fs from 'fs'

let isLoaded = false
const config = convict({
	host: {
		format: String,
		default: '127.0.0.1',
		arg: 'host',
	},
	port: {
		format: Number,
		default: 16622,
		arg: 'port',
	},
	rest: {
		port: {
			format: Number,
			default: 9999,
			arg: 'rest-port',
		},
	},
	main: {
		host: {
			format: String,
			default: '127.0.0.1',
			arg: 'main-host',
		},
		port: {
			format: Number,
			default: 16622,
			arg: 'main-port',
		},
	},
	backup: {
		host: {
			format: String,
			default: '127.0.0.1',
			arg: 'backup-host',
		},
		port: {
			format: Number,
			default: 16622,
			arg: 'backup-port',
		},
	},
	retryCount: {
		format: Number,
		default: 0, //0 to disable
		arg: 'retryCount',
	},
})

export function loadConfig(): typeof config {
	if (isLoaded) {
		console.log('config allready loaded')
		return config
	}
	if (process.env.CONFIG) {
		//TODO: dose this work
		console.log('loading env CONFIG')
		config.loadFile(process.env.CONFIG)
	} else if (fs.existsSync('./config/user.json')) {
		console.log('loading user CONFIG')
		try {
			config.loadFile('./config/user.json')
		} catch {
			console.log('faild to load user CONFIG')
		}
	}
	isLoaded = true
	return config
}

export function saveConfig(conf: typeof config): void {
	fs.writeFile('./config/user.json', conf.toString(), 'utf-8', (err) => {
		if (err) {
			console.log(err)
		}
	})
}
