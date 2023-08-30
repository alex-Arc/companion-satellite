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
})

exitHook(() => {
	console.log('Exiting')
	client.disconnect()
	devices.close().catch(() => null)
	server.close()
})
