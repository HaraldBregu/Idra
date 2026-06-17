export const ShortcutId = {
    openDocumentList: 'openDocumentList',
    openAppSearch: 'openAppSearch',
    newDocument: 'newDocument',
};
export const SHORTCUT_BINDINGS = {
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
export const SHORTCUT_ACCELERATORS = {
    [ShortcutId.openDocumentList]: 'CmdOrCtrl+D',
    [ShortcutId.openAppSearch]: 'CmdOrCtrl+K',
    [ShortcutId.newDocument]: 'Ctrl+Alt+N',
};
export function getShortcutLabel(id, platform) {
    const binding = SHORTCUT_BINDINGS[id];
    return binding[platform];
}
