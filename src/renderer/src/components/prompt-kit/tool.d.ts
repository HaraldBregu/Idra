export type ToolPart = {
    type: string;
    state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
    status?: 'ok' | 'error' | 'blocked' | 'rejected';
    displayName?: string;
    serviceKind?: string;
    serviceId?: string;
    iteration?: number;
    input?: unknown;
    inputText?: string;
    output?: unknown;
    outputText?: string;
    durationMs?: number;
    toolCallId?: string;
    errorText?: string;
};
export type ToolProps = {
    toolPart: ToolPart;
    defaultOpen?: boolean;
    className?: string;
};
declare function Tool({ toolPart, defaultOpen, className }: ToolProps): import("react/jsx-runtime").JSX.Element;
export { Tool };
