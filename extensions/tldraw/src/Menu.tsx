import {
	DefaultMainMenu,
	DefaultMainMenuContent,
	TldrawUiMenuActionItem,
	TldrawUiMenuGroup,
} from 'tldraw';

export default function Menu() {
	return (
		<DefaultMainMenu>
			<TldrawUiMenuGroup id="file">
				<TldrawUiMenuActionItem actionId="new-project" />
				<TldrawUiMenuActionItem actionId="open-file" />
				<TldrawUiMenuActionItem actionId="save-copy" />
			</TldrawUiMenuGroup>
			<DefaultMainMenuContent />
		</DefaultMainMenu>
	);
}
