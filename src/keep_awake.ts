import { powerSaveBlocker } from 'electron';

let blockerId: number | null = null;

// ponytail: 'prevent-app-suspension' keeps the OS awake but lets the display sleep;
// switch to 'prevent-display-sleep' if the screen must stay on too.
export function setKeepAwake(enabled: boolean): void {
	if (enabled && blockerId === null) {
		blockerId = powerSaveBlocker.start('prevent-app-suspension');
	} else if (!enabled && blockerId !== null) {
		powerSaveBlocker.stop(blockerId);
		blockerId = null;
	}
}
