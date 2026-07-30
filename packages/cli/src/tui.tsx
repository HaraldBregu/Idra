import React from 'react';
import { render } from 'ink';
import { FridayTui, type TuiProps } from './app.js';

export async function renderTui(props: TuiProps): Promise<void> {
	const instance = render(<FridayTui {...props} />);
	await instance.waitUntilExit();
}
