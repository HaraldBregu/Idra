import { runBrowserPageOperation } from '../../../../../src/main/agent/tools/web/browser_abort';

it('closes the affected page to interrupt an in-flight browser action', async () => {
	const controller = new AbortController();
	let rejectOperation: (reason: Error) => void = () => undefined;
	const operation = new Promise<never>((_resolve, reject) => {
		rejectOperation = reject;
	});
	const page = {
		close: jest.fn(async () => rejectOperation(new Error('page closed'))),
	};
	const result = runBrowserPageOperation(page, controller.signal, () => operation);
	controller.abort(new Error('cancel browser'));

	await expect(result).rejects.toThrow('page closed');
	expect(page.close).toHaveBeenCalledTimes(1);
});

it('does not start a browser action when already cancelled', async () => {
	const controller = new AbortController();
	controller.abort(new Error('already cancelled'));
	const operation = jest.fn(async () => 'done');

	await expect(
		runBrowserPageOperation({ close: jest.fn() }, controller.signal, operation)
	).rejects.toThrow('already cancelled');
	expect(operation).not.toHaveBeenCalled();
});
