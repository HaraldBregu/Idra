import { FilePlus2, FolderOpen, Save } from 'lucide-react';
import {
	DefaultMainMenu,
	DefaultMainMenuContent,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useActions,
} from 'tldraw';

export default function Menu() {
	const actions = useActions();

	return (
		<DefaultMainMenu>
			<TldrawUiMenuGroup id="file">
				<TldrawUiMenuItem
					{...actions['new-project']}
					iconLeft={<FilePlus2 aria-hidden="true" />}
				/>
				<TldrawUiMenuItem
					{...actions['open-file']}
					iconLeft={<FolderOpen aria-hidden="true" />}
				/>
				<TldrawUiMenuItem
					{...actions['save-copy']}
					iconLeft={<Save aria-hidden="true" />}
				/>
			</TldrawUiMenuGroup>
			<DefaultMainMenuContent />
		</DefaultMainMenu>
	);
}
