import { ExtensionTitleBar } from './ExtensionTitleBar';
import { useAppTheme } from './hooks/useAppTheme';

interface ExtensionShellProps {
	title: string;
}

export function ExtensionShell({ title }: ExtensionShellProps): React.JSX.Element {
	useAppTheme();
	return <ExtensionTitleBar title={title} />;
}
