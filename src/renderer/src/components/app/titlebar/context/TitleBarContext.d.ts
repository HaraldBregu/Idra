interface TitleBarContextValue {
    isMac: boolean;
    isFullScreen: boolean;
}
export declare const useTitleBarContext: () => TitleBarContextValue;
export declare const TitleBarProvider: import("react").Provider<TitleBarContextValue>;
export {};
