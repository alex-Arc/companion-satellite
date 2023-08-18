import { Server } from 'node-osc'
import type { CompanionSatelliteClient } from './client'
import type { DeviceManager } from './devices'

export class OscServer {
	private readonly client: CompanionSatelliteClient
	private readonly devices: DeviceManager
	private server: Server | undefined
	public group: string

	constructor(client: CompanionSatelliteClient, devices: DeviceManager) {
		this.client = client
		this.devices = devices
		this.group = ''
	}

	private bindPaths() {
		this.server?.on('message', (msg: any) => {
			const path = msg[0].split('/')
			const value = msg[1]
			if (path[1] == 'satellite') {
				let newHost = this.client.host
				let newPort = this.client.port

				//if no goup id take all goups and no group
				if (this.group == '') {
					if (path[2] == 'host' || path[3] == 'host') {
						newHost = value
					} else if (path[2] == 'port' || path[3] == 'port') {
						newPort = parseInt(value)
					} else if (path[2] == 'rescan' || path[3] == 'rescan') {
						this.devices.scanDevices()
					}
				}
				//else check group id
				else if (path[2] == this.group) {
					if (path[3] == 'host') {
						newHost = value
					} else if (path[3] == 'port') {
						newPort = parseInt(value)
					} else if (path[3] == 'rescan') {
						this.devices.scanDevices()
					}
				}
				if (!isNaN(newPort) && newPort > 0 && newPort <= 65535) {
					this.client.connect(newHost, newPort).catch((e) => {
						console.log('update config failed:', e)
					})
				}
			}
		})
	}

	public open(port: number): void {
		this.close()
		if (port != 0) {
			this.server = new Server(port, '0.0.0.0', () => {
				console.log(`OSC server starting: port: ${port}`)
				this.bindPaths()
			})
		} else {
			console.log('OSC server not starting: port 0')
		}
	}

	public close(): void {
		if (this.server) {
			this.server.close()
			delete this.server
			console.log('The OSC server is closed')
		}
	}
}
