import { contextBridge } from 'electron';
import { agent } from './agent';
import { app } from './app';
import { channels } from './channels';
import { image } from './image';
import { provider } from './provider';
import { search } from './search';
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
export { channels } from './channels';
export { image } from './image';
export { provider } from './provider';
export { search } from './search';
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
		contextBridge.exposeInMainWorld('notes', notes);
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
	// @ts-ignore (define in dts)
	globalThis.notes = notes;
}
