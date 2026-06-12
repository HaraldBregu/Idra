import { TextDecoder, TextEncoder } from 'node:util';

Object.assign(globalThis, {
	TextDecoder: globalThis.TextDecoder ?? TextDecoder,
	TextEncoder: globalThis.TextEncoder ?? TextEncoder,
});
