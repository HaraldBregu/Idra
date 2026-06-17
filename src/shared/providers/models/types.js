export const MODEL_CAPABILITIES = [
    'llm',
    'research-chat',
    'speech-to-text',
    'text-to-speech',
    'realtime-voice',
    'text-to-image',
    'text-to-audio',
    'music',
];
export function model(id, name, status = 'active') {
    return { id, name, status };
}
export function mergeModelCatalogs(...catalogs) {
    return catalogs.reduce((merged, catalog) => {
        for (const [providerId, models] of Object.entries(catalog)) {
            merged[providerId] = [...(merged[providerId] ?? []), ...models];
        }
        return merged;
    }, {});
}
export function cloneModels(models) {
    return (models ?? []).map((model) => ({ ...model }));
}
export function normalizeProviderId(providerId) {
    return providerId.trim().toLowerCase();
}
