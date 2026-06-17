import { ipcRenderer } from 'electron';
export function typedInvoke(channel, ...args) {
    return ipcRenderer.invoke(channel, ...args);
}
export async function typedInvokeUnwrap(channel, ...args) {
    const result = (await ipcRenderer.invoke(channel, ...args));
    if (!result.success) {
        throw new Error(result.error.message);
    }
    return result.data;
}
export function typedInvokeRaw(channel, ...args) {
    return ipcRenderer.invoke(channel, ...args);
}
export function typedSend(channel, ...args) {
    ipcRenderer.send(channel, ...args);
}
export function typedOn(channel, callback) {
    const handler = (_event, data) => {
        callback(data);
    };
    ipcRenderer.on(channel, handler);
    return () => {
        ipcRenderer.removeListener(channel, handler);
    };
}
