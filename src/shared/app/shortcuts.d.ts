export declare const ShortcutId: {
    readonly openDocumentList: "openDocumentList";
    readonly openAppSearch: "openAppSearch";
    readonly newDocument: "newDocument";
};
export type ShortcutId = (typeof ShortcutId)[keyof typeof ShortcutId];
export interface ShortcutBinding {
    mac: string;
    win: string;
    linux: string;
}
export declare const SHORTCUT_BINDINGS: Record<ShortcutId, ShortcutBinding>;
export declare const SHORTCUT_ACCELERATORS: Record<ShortcutId, string>;
export declare function getShortcutLabel(id: ShortcutId, platform: 'mac' | 'win' | 'linux'): string;
