import {
	TextToImageService,
	type TextToImageAdapterRegistry,
} from '../../../../src/main/text-to-image';
import type { StoreService } from '../../../../src/main/store';
import type { Provider } from '../../../../src/shared/providers';

const provider: Provider = {
	id: 'black-forest-labs',
	name: 'Black Forest Labs',
	baseUrl: 'https://api.bfl.ai/v1',
	apiKey: 'bfl-key',
	capabilities: 'Image',
};

const settings = {
	providerId: provider.id,
	modelId: 'image-provider-coming-soon',
};

function createStore(overrides: Partial<StoreService> = {}): StoreService {
	return {
		getImageCreatorSettings: jest.fn(() => settings),
		getProviderById: jest.fn(() => provider),
		...overrides,
	} as unknown as StoreService;
}

describe('TextToImageService', () => {
	it('resolves settings and normalizes adapter image records', async () => {
		const adapter = {
			create: jest.fn(async () => [
				{
					assetUrl: 'https://example.test/image.png',
					mimeType: 'image/png',
					width: 1024,
					height: 1024,
					jobId: 'job-safe',
				},
			]),
		};
		const adapters: TextToImageAdapterRegistry = {
			resolve: jest.fn(() => adapter),
			has: jest.fn(() => true),
		};
		const service = new TextToImageService(createStore(), { adapters });

		await expect(service.create({ prompt: '  product image  ', count: 1 })).resolves.toEqual({
			providerId: provider.id,
			modelId: settings.modelId,
			images: [
				{
					assetUrl: 'https://example.test/image.png',
					mimeType: 'image/png',
					width: 1024,
					height: 1024,
					jobId: 'job-safe',
					providerId: provider.id,
					modelId: settings.modelId,
				},
			],
		});
		expect(adapter.create).toHaveBeenCalledWith(
			{ prompt: 'product image', count: 1 },
			{ provider, modelId: settings.modelId, signal: undefined }
		);
	});

	it('fails before adapter execution when credentials are missing', async () => {
		const adapter = { create: jest.fn() };
		const service = new TextToImageService(
			createStore({
				getProviderById: jest.fn(() => ({ ...provider, apiKey: '' })),
			}),
			{
				adapters: {
					resolve: jest.fn(() => adapter),
					has: jest.fn(() => true),
				},
			}
		);

		await expect(service.create({ prompt: 'image' })).rejects.toThrow(/credentials are missing/);
		expect(adapter.create).not.toHaveBeenCalled();
	});

	it('fails before prompt execution when no adapter exists', async () => {
		const service = new TextToImageService(createStore(), {
			adapters: {
				resolve: jest.fn(() => undefined),
				has: jest.fn(() => false),
			},
		});

		await expect(service.create({ prompt: 'image' })).rejects.toThrow(/No image adapter exists/);
	});

	it('reports availability only when settings, credentials, model capability, and adapter exist', () => {
		const adapters: TextToImageAdapterRegistry = {
			resolve: jest.fn(() => undefined),
			has: jest.fn(() => false),
		};
		const service = new TextToImageService(createStore(), { adapters });

		expect(service.canCreateImages()).toBe(false);

		const available = new TextToImageService(createStore(), {
			adapters: {
				resolve: jest.fn(),
				has: jest.fn(() => true),
			},
		});

		expect(available.canCreateImages()).toBe(true);
	});
});
