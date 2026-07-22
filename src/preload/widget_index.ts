import { contextBridge } from 'electron';
import { app } from './app';

contextBridge.exposeInMainWorld('app', app);
