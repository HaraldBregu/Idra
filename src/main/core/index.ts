/**
 * Core infrastructure for the Electron main process.
 * These utilities provide the foundation for the refactored architecture.
 */

export { AppState } from './app-state';
export { EventBus, type AppEvent, type AppEvents } from './event-bus';
export { WindowFactory } from './window-factory';
export { ServiceContainer, type Disposable, type ServiceKey } from './service-container';
export { WindowContext, WindowContextManager, type WindowContextConfig } from './window-context';
export {
	WindowScopedServiceFactory,
	createDefaultWindowScopedServiceFactory,
	type WindowScopedServiceDefinition,
} from './window-scoped-service-factory';
