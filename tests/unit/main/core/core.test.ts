import { BrowserWindow } from 'electron';
import { AppState } from '../../../../src/main/core/app-state';
import { EventBus } from '../../../../src/main/core/event-bus';
import { Observable } from '../../../../src/main/core/observable';
import { ServiceContainer } from '../../../../src/main/core/service-container';
import { WindowScopedServiceFactory } from '../../../../src/main/core/window-scoped-service-factory';
import { WindowContextManager } from '../../../../src/main/core/window-context';
import { WindowFactory } from '../../../../src/main/core/window-factory';

class PublicObservable<T> extends Observable<T> {
	onEvent(cb: (event: T) => void) {
		return this.subscribe(cb);
	}
	emitEvent(event: T) {
		this.notify(event);
	}
	count() {
		return this.getSubscriberCount();
	}
	clear() {
		this.clearSubscribers();
	}
}

describe('core modules', () => {
	it('tracks app quit state', () => {
		const state = new AppState();
		expect(state.isQuitting).toBe(false);
		state.setQuitting();
		expect(state.isQuitting).toBe(true);
	});

	it('emits process events and broadcasts renderer events', () => {
		const bus = new EventBus();
		const listener = jest.fn();
		const unsubscribe = bus.on('theme:changed', listener);
		bus.emit('theme:changed', { theme: 'dark' });
		expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'theme:changed', payload: { theme: 'dark' } }));
		unsubscribe();
		bus.emit('theme:changed', { theme: 'light' });
		expect(listener).toHaveBeenCalledTimes(1);

		const send = jest.fn();
		(BrowserWindow.getAllWindows as jest.Mock).mockReturnValueOnce([{ isDestroyed: () => false, webContents: { send } }]);
		bus.broadcast('channel', { x: 1 });
		expect(send).toHaveBeenCalledWith('channel', { x: 1 });
	});

	it('manages observable subscribers safely', () => {
		const obs = new PublicObservable<string>();
		const cb = jest.fn();
		const off = obs.onEvent(cb);
		expect(obs.count()).toBe(1);
		obs.emitEvent('a');
		off();
		obs.emitEvent('b');
		expect(cb).toHaveBeenCalledWith('a');
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it('registers, retrieves, and shuts down disposable services', async () => {
		const container = new ServiceContainer();
		const destroy = jest.fn();
		container.register('svc', { destroy });
		expect(container.get('svc')).toEqual({ destroy });
		expect(() => container.register('svc', {})).toThrow(/already registered/);
		container.register('enabled', false);
		expect(container.get('enabled')).toBe(false);
		await container.shutdown();
		expect(destroy).toHaveBeenCalled();
		expect(container.has('svc')).toBe(false);
	});

	it('creates scoped services in registration order', async () => {
		const globalContainer = new ServiceContainer();
		globalContainer.register('logger', { info: jest.fn(), error: jest.fn() });
		const factory = new WindowScopedServiceFactory();
		factory.register({ key: 'a', factory: () => ({ value: 1 }) });
		factory.register({ key: 'b', factory: ({ windowContainer }) => ({ parent: windowContainer.get('a') }) });
		const local = new ServiceContainer();
		await factory.createAndRegisterAll(local, {
			globalContainer,
			eventBus: new EventBus(),
			storeService: {} as never,
		});
		expect(factory.getRegisteredServices()).toEqual(['a', 'b']);
		expect(local.get('b')).toEqual({ parent: { value: 1 } });
	});

	it('manages window contexts and creates secure browser windows', () => {
		const globalContainer = new ServiceContainer();
		globalContainer.register('store', {});
		globalContainer.register('logger', { info: jest.fn(), error: jest.fn() });
		const bus = new EventBus();
		const manager = new WindowContextManager(globalContainer, bus);
		const win = { id: 42, on: jest.fn() };
		const context = manager.create(win as never);
		expect(manager.get(42)).toBe(context);
		expect(manager.has(42)).toBe(true);

		const factory = new WindowFactory({ info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() } as never);
		const created = factory.create({ width: 900, webPreferences: { devTools: false } });
		expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
			width: 900,
			webPreferences: expect.objectContaining({ contextIsolation: true, nodeIntegration: false, zoomFactor: 1 }),
		}));
		expect(created.webContents.setZoomLevel).toHaveBeenCalledWith(0);
		expect(created.webContents.setZoomFactor).toHaveBeenCalledWith(1);
		expect(created.webContents.setVisualZoomLevelLimits).toHaveBeenCalledWith(1, 1);
		expect(created.webContents.on).toHaveBeenCalledWith('zoom-changed', expect.any(Function));
		expect(created.webContents.setWindowOpenHandler).toHaveBeenCalled();
	});
});
