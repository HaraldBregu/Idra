/**
 * CJS-compatible chokidar mock for Jest.
 * chokidar v5 is pure ESM; this stub lets main-process tests import
 * source modules that depend on it without hitting an ESM syntax error.
 */
const watch = jest.fn(() => ({
	on: jest.fn().mockReturnThis(),
	close: jest.fn().mockResolvedValue(undefined),
}));

module.exports = { watch };
