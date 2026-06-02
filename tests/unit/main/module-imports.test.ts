describe('main module imports', () => {
	it('keeps barrel and low-side-effect modules importable after moving agent up one level', async () => {
		await expect(import('../../../src/main/agent')).resolves.toBeTruthy();
		await expect(import('../../../src/main/agent')).resolves.toBeTruthy();
		await expect(import('../../../src/main/agent')).resolves.toBeTruthy();
		await expect(import('../../../src/main/channels')).resolves.toBeTruthy();
		await expect(import('../../../src/main/capabilities/connectors')).resolves.toBeTruthy();
		await expect(import('../../../src/main/services')).resolves.toBeTruthy();
		await expect(import('../../../src/main/cron')).resolves.toBeTruthy();
		await expect(import('../../../src/main/ipc')).resolves.toBeTruthy();
		await expect(import('../../../src/main/observability')).resolves.toBeTruthy();
		await expect(import('../../../src/main/llm/router')).resolves.toBeTruthy();
		await expect(import('../../../src/main/agent/session/store')).resolves.toBeTruthy();
		await expect(import('../../../src/main/storage')).resolves.toBeTruthy();
		await expect(import('../../../src/main/capabilities/tools')).resolves.toBeTruthy();
		await expect(import('../../../src/main/modules/workspace')).resolves.toBeTruthy();
	});
});
