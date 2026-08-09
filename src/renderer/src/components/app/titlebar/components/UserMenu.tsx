import type { ReactElement } from 'react';
import { Blocks, Bot, Info, MonitorCog, Settings, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserMenuProps {
	readonly align: 'start' | 'end';
}

export function UserMenu({ align }: UserMenuProps): ReactElement {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const settingsLabel = t('settings.title', 'Settings');

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-8 rounded-full"
						title={settingsLabel}
						aria-label={settingsLabel}
					/>
				}
			>
				<User className="size-4" strokeWidth={1.8} />
			</DropdownMenuTrigger>
			<DropdownMenuContent align={align} className="w-52">
				<DropdownMenuLabel>{settingsLabel}</DropdownMenuLabel>
				<DropdownMenuItem onClick={() => navigate('/settings/general')}>
					<Info />
					{t('settings.tabs.general')}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => navigate('/settings/assistant')}>
					<Bot />
					{t('settings.overview.groups.agent')}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => navigate('/settings/system')}>
					<MonitorCog />
					{t('settings.tabs.system')}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => navigate('/settings/extensions')}>
					<Blocks />
					{t('settings.tabs.extensions')}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => navigate('/settings')}>
					<Settings />
					{t('settings.overview.backToSettings')}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
