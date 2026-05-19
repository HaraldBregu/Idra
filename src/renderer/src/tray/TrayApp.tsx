const actions = ['Ask Friday', 'New Task', 'Open App'] as const;

export function TrayApp(): React.JSX.Element {
	return (
		<main className="tray-app" aria-label="Friday tray actions">
			{actions.map((action) => (
				<button className="tray-action" type="button" key={action}>
					{action}
				</button>
			))}
		</main>
	);
}
