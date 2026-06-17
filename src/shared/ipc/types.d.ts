import type { InvokeChannelMap, SendChannelMap, EventChannelMap } from './ipc-channels';
interface IpcError {
    success: false;
    error: {
        code: string;
        message: string;
        stack?: string;
    };
}
interface IpcSuccess<T> {
    success: true;
    data: T;
}
export type IpcResult<T> = IpcSuccess<T> | IpcError;
export declare function typedInvoke<C extends keyof InvokeChannelMap>(channel: C, ...args: InvokeChannelMap[C]['args']): Promise<InvokeChannelMap[C]['result']>;
export declare function typedInvokeUnwrap<C extends keyof InvokeChannelMap>(channel: C, ...args: InvokeChannelMap[C]['args']): Promise<InvokeChannelMap[C]['result']>;
export declare function typedInvokeUnwrap<TResult = unknown>(channel: string, ...args: unknown[]): Promise<TResult>;
export declare function typedInvokeRaw<C extends keyof InvokeChannelMap>(channel: C, ...args: InvokeChannelMap[C]['args']): Promise<IpcResult<InvokeChannelMap[C]['result']>>;
export declare function typedSend<C extends keyof SendChannelMap>(channel: C, ...args: SendChannelMap[C]['args']): void;
export declare function typedOn<C extends keyof EventChannelMap>(channel: C, callback: (data: EventChannelMap[C]['data']) => void): () => void;
export {};
