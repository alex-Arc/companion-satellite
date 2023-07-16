import { LoupedeckDevice, LoupedeckDisplayId, LoupedeckBufferFormat, LoupedeckModelId } from '@loupedeck/node'
import * as imageRs from '@julusian/image-rs'
import { CompanionSatelliteClient } from '../client'
import { CardGenerator } from '../cards'
import { ImageWriteQueue } from '../writeQueue'
import { DeviceDrawProps, DeviceRegisterProps, WrappedDevice } from './api'
import { rgbaToRgb } from '../lib'

export class RazerStreamControllerXWrapper implements WrappedDevice {
	readonly #cardGenerator: CardGenerator
	readonly #deck: LoupedeckDevice
	readonly #deviceId: string

	#queueOutputId: number
	#isShowingCard = true
	#queue: ImageWriteQueue

	#companionSupportsScaling = false

	public get deviceId(): string {
		return this.#deviceId
	}
	public get productName(): string {
		return this.#deck.modelName
	}

	public constructor(deviceId: string, device: LoupedeckDevice, cardGenerator: CardGenerator) {
		this.#deck = device
		this.#deviceId = deviceId
		this.#cardGenerator = cardGenerator

		if (device.modelId !== LoupedeckModelId.RazerStreamControllerX)
			throw new Error('Incorrect model passed to wrapper!')

		this.#queueOutputId = 0

		this.#queue = new ImageWriteQueue(async (key: number, buffer: Buffer) => {
			if (key > 40) {
				return
			}

			const outputId = this.#queueOutputId

			const width = this.#deck.lcdKeySize
			const height = this.#deck.lcdKeySize

			let newbuffer: Buffer = buffer
			if (!this.#companionSupportsScaling) {
				try {
					newbuffer = Buffer.from(
						(await imageRs.ImageTransformer.fromBuffer(buffer, 72, 72, imageRs.PixelFormat.Rgb)
							.scale(width, height)
							.toBuffer(imageRs.PixelFormat.Rgb)) as Uint8Array
					)
				} catch (e) {
					console.log(`device(${deviceId}): scale image failed: ${e}`)
					return
				}
			}

			// Check if generated image is still valid
			if (this.#queueOutputId === outputId) {
				try {
					if (this.#isShowingCard) {
						this.#isShowingCard = false

						// Do a blank of the whole panel before drawing a button, so that there isnt any bleed
						await this.blankDevice(true)
					}

					await this.#deck.drawKeyBuffer(key, newbuffer, LoupedeckBufferFormat.RGB)
				} catch (e_1) {
					console.error(`device(${deviceId}): fillImage failed: ${e_1}`)
				}
			}
		})
	}

	getRegisterProps(): DeviceRegisterProps {
		return {
			keysTotal: 15,
			keysPerRow: 5,
			bitmapSize: this.#deck.lcdKeySize,
			colours: true,
			text: false,
		}
	}

	async close(): Promise<void> {
		this.#queue?.abort()
		this.#deck.close()
	}
	async initDevice(client: CompanionSatelliteClient, status: string): Promise<void> {
		this.#companionSupportsScaling = client.useCustomBitmapResolution

		const convertButtonId = (type: 'button' | 'rotary', id: number): number => {
			if (type === 'button') {
				return id
			}

			// Discard
			return 99
		}
		console.log('Registering key events for ' + this.deviceId)
		this.#deck.on('down', (info) => client.keyDown(this.deviceId, convertButtonId(info.type, info.index)))
		this.#deck.on('up', (info) => client.keyUp(this.deviceId, convertButtonId(info.type, info.index)))

		// Start with blanking it
		await this.blankDevice()

		await this.showStatus(client.host, status)
	}

	async deviceAdded(): Promise<void> {
		this.#queueOutputId++
	}
	async setBrightness(percent: number): Promise<void> {
		this.#deck.setBrightness(percent / 100)
	}
	async blankDevice(skipButtons?: boolean): Promise<void> {
		await this.#deck.blankDevice(true, !skipButtons)
	}
	async draw(d: DeviceDrawProps): Promise<void> {
		if (d.image) {
			this.#queue.queue(d.keyIndex, d.image)
		} else {
			throw new Error(`Cannot draw for Loupedeck without image`)
		}
	}
	async showStatus(hostname: string, status: string): Promise<void> {
		const width = this.#deck.displayMain.width
		const height = this.#deck.displayMain.height

		// abort and discard current operations
		this.#queue?.abort()
		this.#queueOutputId++
		const outputId = this.#queueOutputId
		this.#cardGenerator
			.generateBasicCard(width, height, hostname, status)
			.then(async (buffer) => {
				buffer = await rgbaToRgb(buffer, width, height)

				if (outputId === this.#queueOutputId) {
					console.log('draw buffer')
					this.#isShowingCard = true
					// still valid
					await this.#deck.drawBuffer(
						LoupedeckDisplayId.Center,
						buffer,
						LoupedeckBufferFormat.RGB,
						width,
						height,
						0,
						0
					)
				}
			})
			.catch((e) => {
				console.error(`Failed to fill device`, e)
			})
	}
}
