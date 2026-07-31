import { contextBridge } from 'electron';
import { agent } from './agent';
import { app } from './app';
import { recorder } from './recorder';
import { channels } from './channels';
import { cron } from './cron';
import { mcp } from './mcp';
import { models } from './models';
import { provider } from './provider';
import { search } from './search';
import { skills } from './skills';
import { storage } from './storage';
import { database } from './database';
import { extensions } from './extensions';
import { wiki } from './wiki';
import { win } from './win';

export { agent } from './agent';
export { app } from './app';
export { recorder } from './recorder';
export { channels } from './channels';
export { cron } from './cron';
export { mcp } from './mcp';
export { models } from './models';
export { provider } from './provider';
export { search } from './search';
export { skills } from './skills';
export { storage } from './storage';
export { database } from './database';
export { extensions } from './extensions';
export { wiki } from './wiki';

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('app', app);
		contextBridge.exposeInMainWorld('win', win);
		contextBridge.exposeInMainWorld('agent', agent);
		contextBridge.exposeInMainWorld('recorder', recorder);
		contextBridge.exposeInMainWorld('cron', cron);
		contextBridge.exposeInMainWorld('skills', skills);
		contextBridge.exposeInMainWorld('mcp', mcp);
		contextBridge.exposeInMainWorld('channels', channels);
		contextBridge.exposeInMainWorld('models', models);
		contextBridge.exposeInMainWorld('storage', storage);
		contextBridge.exposeInMainWorld('database', database);
		contextBridge.exposeInMainWorld('provider', provider);
		contextBridge.exposeInMainWorld('search', search);
		contextBridge.exposeInMainWorld('extensions', extensions);
		contextBridge.exposeInMainWorld('plugins', plugins);
		contextBridge.exposeInMainWorld('wiki', wiki);
	} catch (error) {
		console.error('[preload] Failed to expose IPC APIs:', error);
	}
} else {
	// @ts-ignore (define in dts)
	globalThis.app = app;
	// @ts-ignore (define in dts)
	globalThis.win = win;
	// @ts-ignore (define in dts)
	globalThis.agent = agent;
	// @ts-ignore (define in dts)
	globalThis.recorder = recorder;
	// @ts-ignore (define in dts)
	globalThis.cron = cron;
	// @ts-ignore (define in dts)
	globalThis.skills = skills;
	// @ts-ignore (define in dts)
	globalThis.mcp = mcp;
	// @ts-ignore (define in dts)
	globalThis.channels = channels;
	// @ts-ignore (define in dts)
	globalThis.models = models;
	// @ts-ignore (define in dts)
	globalThis.storage = storage;
	// @ts-ignore (define in dts)
	globalThis.database = database;
	// @ts-ignore (define in dts)
	globalThis.provider = provider;
	// @ts-ignore (define in dts)
	globalThis.search = search;
	// @ts-ignore (define in dts)
	globalThis.extensions = extensions;
	// @ts-ignore (define in dts)
	globalThis.plugins = plugins;
	// @ts-ignore (define in dts)
	globalThis.wiki = wiki;
}
