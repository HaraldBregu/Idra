/**
 * Jest setupFilesAfterEnv for the "renderer" project.
 * Extends Jest matchers with @testing-library/jest-dom assertions.
 */
import '@testing-library/jest-dom';

// Stub Vite define globals that are replaced at build time but are undefined in Jest.
Object.assign(globalThis, {
	__APP_NAME__: 'Friday',
	__APP_VERSION__: '0.0.0-test',
	__APP_DESCRIPTION__: 'AI desktop assistant',
	__APP_AUTHOR__: 'Test',
	__APP_LICENSE__: 'MIT',
});
