import type { Tray } from './tray';

export function setTrayEnabled(tray: Tray, enabled: boolean): void {
	if (enabled && !tray.isCreated()) {
		tray.create();
	} else if (!enabled && tray.isCreated()) {
		tray.destroy();
	}
}
