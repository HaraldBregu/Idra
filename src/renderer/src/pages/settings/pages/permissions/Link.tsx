import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SettingsPanel, SettingsRow } from '../../components';

export function PermissionsLink({
	path,
	title,
	description,
}: {
	readonly path: string;
	readonly title: string;
	readonly description: string;
}): React.JSX.Element {
	const navigate = useNavigate();
	return (
		<SettingsPanel>
			<div
				role="button"
				tabIndex={0}
				className="cursor-pointer hover:bg-muted/40"
				onClick={() => navigate(path)}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						navigate(path);
					}
				}}
			>
				<SettingsRow
					title={title}
					description={description}
					className="grid-cols-[minmax(0,1fr)_auto] border-b-0"
					actionClassName="w-auto justify-end"
					actions={<ChevronRight className="size-4 text-muted-foreground" />}
				/>
			</div>
		</SettingsPanel>
	);
}
