import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TitleBarCenterContainer } from './TitleBarCenterContainer';
import { TitleBarCenterContainerTitle } from './TitleBarCenterContainerTitle';
import { TitleBarContainer } from './TitleBarContainer';
import { TitleBarLeftContainer } from './TitleBarLeftContainer';
import { ExtensionWindowControls } from './ExtensionWindowControls';
import { useExtensionWindowState } from './hooks/useExtensionWindowState';

const isMac =
	typeof navigator !== 'undefined' &&
	(navigator.platform === 'MacIntel' || navigator.platform.startsWith('Mac'));

interface ExtensionTitleBarProps {
	title: string;
}

export function ExtensionTitleBar({ title }: ExtensionTitleBarProps): React.JSX.Element {
	const isMaximized = useExtensionWindowState();

	return (
		<TitleBarContainer className="relative">
			<TitleBarLeftContainer isMac={isMac}>
				{!isMac ? (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="ml-2 size-7 rounded-md text-muted-foreground"
						onClick={() => window.win.popupMenu()}
						title="Application menu"
						aria-label="Application menu"
					>
						<Menu className="size-[15px]" strokeWidth={1.5} />
					</Button>
				) : null}
			</TitleBarLeftContainer>
			<TitleBarCenterContainer>
				<TitleBarCenterContainerTitle
					className={isMac ? 'max-w-[calc(100%-180px)] truncate' : 'max-w-[calc(100%-380px)] truncate'}
				>
					{title}
				</TitleBarCenterContainerTitle>
			</TitleBarCenterContainer>
			<div className="flex-1" />
			{!isMac ? <ExtensionWindowControls isMaximized={isMaximized} /> : null}
		</TitleBarContainer>
	);
}
