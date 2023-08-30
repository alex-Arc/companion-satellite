import exitHook = require('exit-hook')
import { CompanionSatelliteClient } from './client'
import { DeviceManager } from './devices'

import { RestServer } from './rest'

import { loadConig, saveConfig } from './config'

console.log('Starting')

const config = loadConig()
const client = new CompanionSatelliteClient({ debug: true })
const devices = new DeviceManager(client)
const server = new RestServer(client, devices)

client.on('log', (l) => console.log(l))
client.on('error', (e) => console.error(e))

client.connect(config.get('companion.host'), config.get('companion.port')).catch((e) => {
	console.log(`Failed to connect`, e)
})
server.open(config.get('rest.port'))

client.on('ipChange', (newIP, newPort) => {
	config.set('companion.host', newIP)
	config.set('companion.port', newPort)
	saveConfig(config)
	connectErrorCount = 0
})

exitHook(() => {
	console.log('Exiting')
	client.disconnect()
	devices.close().catch(() => null)
	server.close()
})

let connectErrorCount = 0
client.on('error', (e) => {
	if (e.message.includes('ECONNREFUSED') || e.message.includes('ETIMEDOUT')) {
		connectErrorCount = connectErrorCount + 1
		if (config.get('retryCount') != 0 && connectErrorCount >= config.get('retryCount')) {
			connectErrorCount = 0
			if (client.host == config.get('companionMain.host') && client.port == config.get('companionMain.port')) {
				console.log('switch to backup companion')
				client.connect(config.get('companionBackup.host'), config.get('companionBackup.port')).catch(() => null)
			} else {
				console.log('switch to main companion')
				client.connect(config.get('companionMain.host'), config.get('companionMain.port')).catch(() => null)
			}
		}
	}
})
