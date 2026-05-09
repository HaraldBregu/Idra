// ---------------------------------------------------------------------------
// Shared Keyboard Shortcut Constants
// ---------------------------------------------------------------------------
// Single source of truth for all app-level keyboard shortcuts.
// Registered in the Electron main process (menu accelerators) and forwarded
// to the renderer via AppChannels.shortcut.
//
// Do NOT import Electron, Node.js, React, or any browser APIs here.
// ---------------------------------------------------------------------------

export const ShortcutId = {
	/** Open the command palette. */
	openDocumentList: 'openDocumentList',
	/** Open the app-wide search modal. */
	openAppSearch: 'openAppSearch',
	/** Create a new document. */
	newDocument: 'newDocument',
} as const;

export type ShortcutId = (typeof ShortcutId)[keyof typeof ShortcutId];

/** Human-readable key label per platform. Used in UI hints. */
export interface ShortcutBinding {
	mac: string;
	win: string;
	linux: string;
}

export const SHORTCUT_BINDINGS: Record<ShortcutId, ShortcutBinding> = {
	[ShortcutId.openDocumentList]: {
		mac: '⌘D',
		win: 'Ctrl+D',
		linux: 'Ctrl+D',
	},
	[ShortcutId.openAppSearch]: {
		mac: '⌘K',
		win: 'Ctrl+K',
		linux: 'Ctrl+K',
	},
	[ShortcutId.newDocument]: {
		mac: '⌃⌥N',
		win: 'Ctrl+Alt+N',
		linux: 'Ctrl+Alt+N',
	},
};

/**
 * Electron-format accelerator per shortcut.
 * `CmdOrCtrl` resolves to ⌘ on macOS and Ctrl on Windows/Linux.
 */
export const SHORTCUT_ACCELERATORS: Record<ShortcutId, string> = {
	[ShortcutId.openDocumentList]: 'CmdOrCtrl+D',
	[ShortcutId.openAppSearch]: 'CmdOrCtrl+K',
	[ShortcutId.newDocument]: 'Ctrl+Alt+N',
};

export function getShortcutLabel(id: ShortcutId, platform: 'mac' | 'win' | 'linux'): string {
	const binding = SHORTCUT_BINDINGS[id];
	return binding[platform];
}
