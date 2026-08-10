import { FilePlus2, FolderOpen, Save } from 'lucide-react';
import {
	AccessibilityMenu,
	DefaultMainMenu,
	EditSubmenu,
	ExportFileContentSubMenu,
	ExtrasGroup,
	InputModeMenu,
	KeyboardShortcutsMenuItem,
	LanguageMenu,
	TldrawUiMenuSubmenu,
	ToggleDebugModeItem,
	ToggleDynamicSizeModeItem,
	ToggleEdgeScrollingItem,
	ToggleFocusModeItem,
	ToggleGridItem,
	TogglePasteAtCursorItem,
	ToggleSnapModeItem,
	ToggleToolLockItem,
	ToggleWrapModeItem,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	ViewSubmenu,
	useActions,
} from 'tldraw';

export default function Menu() {
	const actions = useActions();

	return (
		<DefaultMainMenu>
			<TldrawUiMenuGroup id="file">
				<TldrawUiMenuItem
					{...actions['new-project']}
					icon={undefined}
					iconLeft={<FilePlus2 aria-hidden="true" />}
				/>
				<TldrawUiMenuItem
					{...actions['open-file']}
					icon={undefined}
					iconLeft={<FolderOpen aria-hidden="true" />}
				/>
				<TldrawUiMenuItem
					{...actions['save-copy']}
					icon={undefined}
					iconLeft={<Save aria-hidden="true" />}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="basic">
				<EditSubmenu />
				<ViewSubmenu />
				<ExportFileContentSubMenu />
				<ExtrasGroup />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="preferences">
				<TldrawUiMenuSubmenu id="preferences" label="menu.preferences">
					<TldrawUiMenuGroup id="preferences-actions">
						<ToggleSnapModeItem />
						<ToggleToolLockItem />
						<ToggleGridItem />
						<ToggleWrapModeItem />
						<ToggleFocusModeItem />
						<ToggleEdgeScrollingItem />
						<ToggleDynamicSizeModeItem />
						<TogglePasteAtCursorItem />
						<ToggleDebugModeItem />
					</TldrawUiMenuGroup>
					<TldrawUiMenuGroup id="user-interface-submenus">
						<AccessibilityMenu />
						<InputModeMenu />
					</TldrawUiMenuGroup>
				</TldrawUiMenuSubmenu>
				<LanguageMenu />
				<KeyboardShortcutsMenuItem />
			</TldrawUiMenuGroup>
		</DefaultMainMenu>
	);
}
