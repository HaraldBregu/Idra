import { agent, connect, isFriday } from '@friday/sdk';

// Projects live behind the agent's project tools rather than a dedicated channel, so
// every call here is one agent turn restricted to a single tool. The structured tool
// output arrives on the event stream, which is why nothing parses the assistant's prose.
const TOOLS = {
	list: 'list_projects',
	create: 'create_project',
	update: 'update_project',
	remove: 'delete_project',
};

let remote;

/** Drive a Friday running elsewhere: connect() over the local API instead of the globals. */
export function useRemote({ token, url }) {
	remote = connect({ token, url });
	return remote.ping();
}

export function connected() {
	return isFriday() || Boolean(remote);
}

function api() {
	if (isFriday()) return agent;
	if (remote) return remote.agent;
	throw new Error('Not connected to Friday. Open this extension in the app, or paste an API token.');
}

async function run(prompt, tool, handlers = {}) {
	const assistant = api();
	let output;

	await assistant.send(prompt, { toolsAllow: [tool], lightContext: true }, (event) => {
		switch (event.type) {
			case 'run_state':
				handlers.onState?.(event.state);
				break;
			case 'tool_permission_request':
				// delete_project always asks; approving here keeps the flow in the extension.
				handlers.onPermission?.(event, (decision) =>
					assistant.respondToolPermission(event.toolCallId, decision)
				);
				break;
			case 'tool_call_result':
				if (event.toolName === tool && event.status === 'ok') output = event.output;
				break;
			default:
				break;
		}
	});

	return output;
}

export const projects = {
	async list(handlers) {
		const output = await run('List all projects.', TOOLS.list, handlers);
		return output?.projects ?? [];
	},
	create(name, description, handlers) {
		return run(
			`Create a project named "${name}" described as "${description}".`,
			TOOLS.create,
			handlers
		);
	},
	update(name, description, handlers) {
		return run(
			`Update the project named "${name}" so its description is "${description}".`,
			TOOLS.update,
			handlers
		);
	},
	remove(name, handlers) {
		return run(`Delete the project named "${name}".`, TOOLS.remove, handlers);
	},
};
