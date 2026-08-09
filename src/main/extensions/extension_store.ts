import { randomUUID } from 'node:crypto';
import { lstatSync, mkdirSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import Store from 'electron-store';
import type { ExtensionStoreValue } from '../../shared/extension_store_types';
import { extensionDataRoot } from './extension_data_root';
import { isExtensionId } from './extension_id';
import { isExtensionStoreValue } from './extension_store_value';

type ExtensionStoreState = Record<string, ExtensionStoreValue>;

export class ExtensionStorage {
	private readonly stores = new Map<string, Store<ExtensionStoreState>>();

	constructor(private readonly root = extensionDataRoot()) {}

	get<T extends ExtensionStoreValue = ExtensionStoreValue>(
		extensionId: string,
		key: string
	): T | undefined {
		this.validateKey(key);
		return this.store(extensionId).get(key) as T | undefined;
	}

	set(extensionId: string, key: string, value: ExtensionStoreValue): void {
		this.validateKey(key);
		if (!isExtensionStoreValue(value)) throw new Error('Invalid extension store value.');
		this.store(extensionId).set(key, value);
	}

	delete(extensionId: string, key: string): void {
		this.validateKey(key);
		this.store(extensionId).delete(key);
	}

	async readFile(extensionId: string, filePath: string): Promise<Uint8Array> {
		const target = await this.existingFile(extensionId, filePath);
		if (!target) throw new Error('Extension file not found.');
		return new Uint8Array(await fs.readFile(target));
	}

	async writeFile(extensionId: string, filePath: string, data: Uint8Array): Promise<void> {
		if (!(data instanceof Uint8Array)) throw new Error('Extension file data must be bytes.');
		const target = await this.writableFile(extensionId, filePath);
		const temporary = path.join(
			path.dirname(target),
			`.${path.basename(target)}.${randomUUID()}.tmp`
		);
		try {
			await fs.writeFile(temporary, data, { flag: 'wx', mode: 0o600 });
			await fs.rename(temporary, target);
		} finally {
			await fs.rm(temporary, { force: true });
		}
	}

	async deleteFile(extensionId: string, filePath: string): Promise<void> {
		const target = await this.existingFile(extensionId, filePath);
		if (target) await fs.unlink(target);
	}

	private store(extensionId: string): Store<ExtensionStoreState> {
		const existing = this.stores.get(extensionId);
		if (existing) return existing;
		const directory = this.ensureStoreDirectory(extensionId);
		const created = new Store<ExtensionStoreState>({
			name: 'store',
			cwd: directory,
			accessPropertiesByDotNotation: false,
			clearInvalidConfig: false,
			configFileMode: 0o600,
		});
		this.stores.set(extensionId, created);
		return created;
	}

	private ensureStoreDirectory(extensionId: string): string {
		const directory = this.namespace(extensionId);
		mkdirSync(this.root, { recursive: true });
		this.assertDirectorySync(this.root);
		try {
			mkdirSync(directory);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
		}
		this.assertDirectorySync(directory);
		return directory;
	}

	private assertDirectorySync(directory: string): void {
		const stats = lstatSync(directory);
		if (stats.isSymbolicLink() || !stats.isDirectory()) {
			throw new Error('Invalid extension storage directory.');
		}
	}

	private namespace(extensionId: string): string {
		if (!isExtensionId(extensionId)) throw new Error('Invalid extension ID.');
		return path.join(this.root, extensionId);
	}

	private validateKey(key: string): void {
		if (
			typeof key !== 'string' ||
			key.length === 0 ||
			key.includes('\0') ||
			key === '__proto__' ||
			key === 'constructor' ||
			key === 'prototype' ||
			key === '__internal__' ||
			key.startsWith('__internal__.')
		) {
			throw new Error('Invalid extension store key.');
		}
	}

	private fileSegments(filePath: string): string[] {
		if (
			typeof filePath !== 'string' ||
			filePath.length === 0 ||
			filePath.includes('\\') ||
			filePath.includes('\0') ||
			path.isAbsolute(filePath) ||
			path.posix.isAbsolute(filePath) ||
			path.win32.isAbsolute(filePath)
		) {
			throw new Error('Invalid extension file path.');
		}
		const segments = filePath.split('/');
		if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
			throw new Error('Invalid extension file path.');
		}
		return segments;
	}

	private async existingFile(extensionId: string, filePath: string): Promise<string | undefined> {
		const segments = this.fileSegments(filePath);
		const namespace = this.namespace(extensionId);
		const filesRoot = path.join(namespace, 'files');
		let current = this.root;
		for (const segment of [extensionId, 'files', ...segments.slice(0, -1)]) {
			if (!(await this.isExistingDirectory(current))) return undefined;
			current = path.join(current, segment);
		}
		if (!(await this.isExistingDirectory(current))) return undefined;

		const target = path.join(filesRoot, ...segments);
		let stats;
		try {
			stats = await fs.lstat(target);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
			throw error;
		}
		if (stats.isSymbolicLink() || !stats.isFile()) {
			throw new Error('Extension file path is not a regular file.');
		}
		await this.assertContained(filesRoot, target);
		return target;
	}

	private async writableFile(extensionId: string, filePath: string): Promise<string> {
		const segments = this.fileSegments(filePath);
		const namespace = this.namespace(extensionId);
		const filesRoot = path.join(namespace, 'files');
		await fs.mkdir(this.root, { recursive: true });
		await this.requireDirectory(this.root);
		await this.createDirectory(namespace);
		await this.createDirectory(filesRoot);

		let parent = filesRoot;
		for (const segment of segments.slice(0, -1)) {
			parent = path.join(parent, segment);
			await this.createDirectory(parent);
		}

		const target = path.join(filesRoot, ...segments);
		try {
			const stats = await fs.lstat(target);
			if (stats.isSymbolicLink() || !stats.isFile()) {
				throw new Error('Extension file path is not a regular file.');
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
		}
		await this.assertContained(filesRoot, parent);
		return target;
	}

	private async createDirectory(directory: string): Promise<void> {
		try {
			await fs.mkdir(directory);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
		}
		await this.requireDirectory(directory);
	}

	private async isExistingDirectory(directory: string): Promise<boolean> {
		try {
			await this.requireDirectory(directory);
			return true;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
			throw error;
		}
	}

	private async requireDirectory(directory: string): Promise<void> {
		const stats = await fs.lstat(directory);
		if (stats.isSymbolicLink() || !stats.isDirectory()) {
			throw new Error('Invalid extension storage directory.');
		}
	}

	private async assertContained(root: string, target: string): Promise<void> {
		const [resolvedRoot, resolvedTarget] = await Promise.all([
			fs.realpath(root),
			fs.realpath(target),
		]);
		const relative = path.relative(resolvedRoot, resolvedTarget);
		if (
			relative === '..' ||
			relative.startsWith(`..${path.sep}`) ||
			path.isAbsolute(relative)
		) {
			throw new Error('Extension file path escapes its storage folder.');
		}
	}
}
