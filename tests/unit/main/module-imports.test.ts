describe('main module imports', () => {
	it('keeps barrel and low-side-effect modules importable after moving agent up one level', async () => {
		await expect(import('../../../src/main/agent')).resolves.toBeTruthy();
		await expect(import('../../../src/main/agent')).resolves.toBeTruthy();
		await expect(import('../../../src/main/agent')).resolves.toBeTruthy();
		await expect(import('../../../src/main/channels')).resolves.toBeTruthy();
		await expect(import('../../../src/main/agent/connectors')).resolves.toBeTruthy();
		await expect(import('../../../src/main/core')).resolves.toBeTruthy();
		await expect(import('../../../src/main/cron')).resolves.toBeTruthy();
		await expect(import('../../../src/main/ipc')).resolves.toBeTruthy();
		await expect(import('../../../src/main/logger')).resolves.toBeTruthy();
		await expect(import('../../../src/main/agent/mcp')).resolves.toBeTruthy();
		await expect(import('../../../src/main/monitor')).resolves.toBeTruthy();
		await expect(import('../../../src/main/provider/factory')).resolves.toBeTruthy();
		await expect(import('../../../src/main/session/store')).resolves.toBeTruthy();
		await expect(import('../../../src/main/store')).resolves.toBeTruthy();
		await expect(import('../../../src/main/agent/tools')).resolves.toBeTruthy();
		await expect(import('../../../src/main/workspace')).resolves.toBeTruthy();
	});
});
