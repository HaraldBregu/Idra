import { app } from 'electron';
import type { AppState } from './app_state';
import type { LoggerService } from '../shared';

export function setupAppLifecycle(appState: AppState, logger?: LoggerService): void {
	app.on('before-quit', () => {
		appState.setQuitting();
		logger?.info('App', 'Application is quitting');
	});

	app.on('window-all-closed', () => {
		logger?.info('App', 'All windows closed');
		if (process.platform !== 'darwin' && appState.isQuitting) {
			app.quit();
		}
	});

	app.on('activate', () => {
		logger?.debug('App', 'Application activated');
	});

	app.on('will-quit', () => {
		logger?.info('App', 'Application will quit');
	});

	app.on('quit', (_event, exitCode) => {
		logger?.info('App', `Application quit with exit code: ${exitCode}`);
	});
}
