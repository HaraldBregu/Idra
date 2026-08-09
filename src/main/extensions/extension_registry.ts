import { isExtensionId } from './extension_id';

export class ExtensionRegistry {
	private readonly extensions = new Map<number, string>();

	register(webContentsId: number, extensionId: string): void {
		if (!Number.isInteger(webContentsId) || webContentsId <= 0) {
			throw new Error('Invalid extension web contents ID.');
		}
		if (!isExtensionId(extensionId)) throw new Error('Invalid extension ID.');

		const registered = this.extensions.get(webContentsId);
		if (registered && registered !== extensionId) {
			throw new Error('Extension web contents is already registered.');
		}
		this.extensions.set(webContentsId, extensionId);
	}

	unregister(webContentsId: number, extensionId?: string): void {
		if (extensionId && this.extensions.get(webContentsId) !== extensionId) return;
		this.extensions.delete(webContentsId);
	}

	resolve(webContentsId: number): string {
		const extensionId = this.extensions.get(webContentsId);
		if (!extensionId) {
			throw new Error('Extension storage is only available to registered extension views.');
		}
		return extensionId;
	}
}
