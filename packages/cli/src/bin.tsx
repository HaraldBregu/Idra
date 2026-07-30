#!/usr/bin/env node
import process from 'node:process';
import { installPlugin } from './install.js';
import { launchFriday } from './launch.js';
import { createProgram } from './program.js';
import { renderTui } from './tui.js';

const program = createProgram({
	install: installPlugin,
	launch: launchFriday,
	tui: async () => {
		await renderTui({ install: installPlugin, launch: launchFriday });
	},
});

try {
	await program.parseAsync(process.argv);
} catch (error) {
	process.stderr.write(`Error: ${error instanceof Error ? error.message : 'Command failed.'}\n`);
	process.exitCode = 1;
}
