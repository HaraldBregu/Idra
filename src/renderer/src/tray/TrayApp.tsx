const actions = [
	{
		label: 'Ask Friday',
		message: 'Hello Friday, I am sending this from the tray.',
	},
	{ label: 'New Task' },
	{ label: 'Open App' },
] as const;

export function TrayApp(): React.JSX.Element {
	const handleAction = (action: (typeof actions)[number]): void => {
		if (!('message' in action)) return;
		void window.app.sendTrayChatMessage(action.message);
	};

	return (
		<main className="tray-app" aria-label="Friday tray actions">
			{actions.map((action) => (
				<button
					className="tray-action"
					type="button"
					key={action.label}
					onClick={() => handleAction(action)}
				>
					{action.label}
				</button>
			))}
		</main>
	);
}
