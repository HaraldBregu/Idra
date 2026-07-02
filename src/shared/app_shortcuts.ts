export const ShortcutId = {
	openDocumentList: 'openDocumentList',
	openAppSearch: 'openAppSearch',
	newDocument: 'newDocument',
} as const;

export type ShortcutId = (typeof ShortcutId)[keyof typeof ShortcutId];

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

export const SHORTCUT_ACCELERATORS: Record<ShortcutId, string> = {
	[ShortcutId.openDocumentList]: 'CmdOrCtrl+D',
	[ShortcutId.openAppSearch]: 'CmdOrCtrl+K',
	[ShortcutId.newDocument]: 'Ctrl+Alt+N',
};

export function getShortcutLabel(id: ShortcutId, platform: 'mac' | 'win' | 'linux'): string {
	const binding = SHORTCUT_BINDINGS[id];
	return binding[platform];
}
