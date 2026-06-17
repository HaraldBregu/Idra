export async function fileToSttAudioInput(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return {
        data: btoa(binary),
        encoding: 'base64',
        mimeType: file.type || 'audio/webm',
        fileName: file.name,
        byteLength: file.size,
    };
}
export function appendTranscriptionText(baseText, transcript) {
    const trimmedTranscript = transcript.trim();
    if (!trimmedTranscript)
        return baseText;
    if (!baseText)
        return trimmedTranscript;
    const separator = /\s$/.test(baseText) ? '' : ' ';
    return `${baseText}${separator}${trimmedTranscript}`;
}
