import { ImageCreateTaskHandler } from '../../../../src/main/tasks';
import type { TextToImageService } from '../../../../src/main/text-to-image';

describe('ImageCreateTaskHandler', () => {
	it('validates safe image task input', () => {
		const handler = new ImageCreateTaskHandler({} as TextToImageService);

		expect(
			handler.validateInput({
				prompt: '  create a product image  ',
				negativePrompt: ' blur ',
				aspectRatio: '1:1',
				count: 1,
				seed: 42,
				styleHints: [' studio ', ''],
				references: [
					{
						type: 'workspace-file',
						path: 'input.png',
						mimeType: 'image/png',
					},
				],
			})
		).toEqual({
			prompt: 'create a product image',
			negativePrompt: 'blur',
			aspectRatio: '1:1',
			count: 1,
			seed: 42,
			styleHints: ['studio'],
			references: [
				{
					type: 'workspace-file',
					path: 'input.png',
					mimeType: 'image/png',
				},
			],
		});
	});

	it('rejects provider and credential fields in task input', () => {
		const handler = new ImageCreateTaskHandler({} as TextToImageService);

		expect(() =>
			handler.validateInput({
				prompt: 'image',
				apiKey: 'secret',
			})
		).toThrow(/apiKey is not allowed/);
		expect(() =>
			handler.validateInput({
				prompt: 'image',
				providerId: 'openai',
			})
		).toThrow(/providerId is not allowed/);
	});

	it('calls the text-to-image service with the task abort signal', async () => {
		const result = {
			providerId: 'black-forest-labs',
			modelId: 'image-provider-coming-soon',
			images: [],
		};
		const service = {
			create: jest.fn(async () => result),
		};
		const handler = new ImageCreateTaskHandler(service as unknown as TextToImageService);
		const controller = new AbortController();
		const updateProgress = jest.fn();
		const input = handler.validateInput({ prompt: 'image', count: 1 });

		await expect(
			handler.run({
				taskId: 'task-1',
				input,
				signal: controller.signal,
				updateProgress,
			})
		).resolves.toBe(result);

		expect(service.create).toHaveBeenCalledWith(input, controller.signal);
		expect(updateProgress).toHaveBeenCalledWith({ message: 'Creating image' });
		expect(updateProgress).toHaveBeenCalledWith({ message: 'Image created' });
	});
});
