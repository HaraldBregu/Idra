import { contextBridge } from 'electron';
import { agent } from './agent';
import { app } from './app';
import { recorder } from './recorder';
import { channels } from './channels';
import { cron } from './cron';
import { image } from './image';
import { mcp } from './mcp';
import { provider } from './provider';
import { search } from './search';
import { skills } from './skills';
import { sound } from './sound';
import { storage } from './storage';
import { text } from './text';
import { transcribe } from './transcribe';
import { video } from './video';
import { voice } from './voice';
import { widgets } from './widgets';
import { win } from './win';

export { agent } from './agent';
export { app } from './app';
export { recorder } from './recorder';
export { channels } from './channels';
export { cron } from './cron';
export { image } from './image';
export { mcp } from './mcp';
export { provider } from './provider';
export { search } from './search';
export { skills } from './skills';
export { sound } from './sound';
export { storage } from './storage';
export { text } from './text';
export { transcribe } from './transcribe';
export { video } from './video';
export { voice } from './voice';
export { widgets } from './widgets';

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
		contextBridge.exposeInMainWorld('storage', storage);
		contextBridge.exposeInMainWorld('provider', provider);
		contextBridge.exposeInMainWorld('search', search);
		contextBridge.exposeInMainWorld('transcribe', transcribe);
		contextBridge.exposeInMainWorld('voice', voice);
		contextBridge.exposeInMainWorld('image', image);
		contextBridge.exposeInMainWorld('video', video);
		contextBridge.exposeInMainWorld('sound', sound);
		contextBridge.exposeInMainWorld('text', text);
		contextBridge.exposeInMainWorld('widgets', widgets);
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
	globalThis.audio = audio;
	// @ts-ignore (define in dts)
	globalThis.cron = cron;
	// @ts-ignore (define in dts)
	globalThis.skills = skills;
	// @ts-ignore (define in dts)
	globalThis.mcp = mcp;
	// @ts-ignore (define in dts)
	globalThis.channels = channels;
	// @ts-ignore (define in dts)
	globalThis.storage = storage;
	// @ts-ignore (define in dts)
	globalThis.provider = provider;
	// @ts-ignore (define in dts)
	globalThis.search = search;
	// @ts-ignore (define in dts)
	globalThis.transcribe = transcribe;
	// @ts-ignore (define in dts)
	globalThis.voice = voice;
	// @ts-ignore (define in dts)
	globalThis.image = image;
	// @ts-ignore (define in dts)
	globalThis.video = video;
	// @ts-ignore (define in dts)
	globalThis.sound = sound;
	// @ts-ignore (define in dts)
	globalThis.text = text;
	// @ts-ignore (define in dts)
	globalThis.widgets = widgets;
}
