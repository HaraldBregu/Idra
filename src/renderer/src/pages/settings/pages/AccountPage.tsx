import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type EditingField = 'firstName' | 'lastName' | null;

interface UserProfile {
	firstName: string;
	lastName: string;
}

const EMPTY_PROFILE: UserProfile = { firstName: '', lastName: '' };

interface EditableNameProps {
	readonly value: string;
	readonly editing: boolean;
	readonly onStartEdit: () => void;
	readonly onCommit: (next: string) => void;
	readonly onCancel: () => void;
}

const EditableName: React.FC<EditableNameProps> = ({
	value,
	editing,
	onStartEdit,
	onCommit,
	onCancel,
}) => {
	const [draft, setDraft] = useState(value);

	useEffect(() => {
		if (editing) setDraft(value);
	}, [editing, value]);

	if (!editing) {
		return (
			<button
				type="button"
				onClick={onStartEdit}
				className="text-sm cursor-text hover:underline underline-offset-2"
			>
				{value || '—'}
			</button>
		);
	}

	return (
		<Input
			autoFocus
			onFocus={(e) => e.currentTarget.select()}
			value={draft}
			onChange={(e) => setDraft(e.target.value)}
			onBlur={() => onCommit(draft)}
			onKeyDown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					onCommit(draft);
				} else if (e.key === 'Escape') {
					e.preventDefault();
					onCancel();
				}
			}}
			className="h-7 w-48"
		/>
	);
};

const AccountPage: React.FC = () => {
	const { t } = useTranslation();
	const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
	const [editing, setEditing] = useState<EditingField>(null);

	const persist = useCallback(
		(field: 'firstName' | 'lastName', raw: string) => {
			const trimmed = raw.trim();
			if (trimmed === profile[field]) {
				setEditing(null);
				return;
			}
			const next: UserProfile = { ...profile, [field]: trimmed };
			setProfile(next);
			setEditing(null);
		},
		[profile]
	);

	const fullName = `${profile.firstName} ${profile.lastName}`.trim();
	const displayName = fullName || t('settings.account.guest');
	const subtitle = t('settings.account.notSignedIn');

	return (
		<div className="w-full">
			<h1 className="text-lg font-normal mb-6">{t('settings.tabs.account')}</h1>

			<div className="pt-6 pb-2 first:pt-0">
				<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					{t('settings.account.section')}
				</h2>
			</div>

			<div className="flex flex-col gap-2">
				<div className="flex w-full flex-wrap items-center gap-2.5 border-b border-border py-2 text-sm">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-background">
						<UserCircle className="h-5 w-5 text-muted-foreground" />
					</div>
					<div className="flex flex-1 flex-col gap-1">
						<h3 className="text-sm leading-snug font-medium">{displayName}</h3>
						<p className="text-xs leading-normal text-muted-foreground">{subtitle}</p>
					</div>
				</div>

				<div className="flex w-full flex-wrap items-center gap-2.5 border-b border-border py-2 text-sm">
					<div className="flex flex-1 flex-col gap-1">
						<h3 className="text-sm leading-snug font-medium">
							{t('settings.account.firstName')}
						</h3>
						<p className="text-sm leading-normal text-muted-foreground">
							{t('settings.account.editHint')}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<EditableName
							value={profile.firstName}
							editing={editing === 'firstName'}
							onStartEdit={() => setEditing('firstName')}
							onCommit={(v) => persist('firstName', v)}
							onCancel={() => setEditing(null)}
						/>
					</div>
				</div>

				<div className="flex w-full flex-wrap items-center gap-2.5 border-b border-border py-2 text-sm">
					<div className="flex flex-1 flex-col gap-1">
						<h3 className="text-sm leading-snug font-medium">
							{t('settings.account.lastName')}
						</h3>
						<p className="text-sm leading-normal text-muted-foreground">
							{t('settings.account.editHint')}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<EditableName
							value={profile.lastName}
							editing={editing === 'lastName'}
							onStartEdit={() => setEditing('lastName')}
							onCommit={(v) => persist('lastName', v)}
							onCancel={() => setEditing(null)}
						/>
					</div>
				</div>

				<div className="flex w-full flex-wrap items-center gap-2.5 border-b border-border py-2 text-sm">
					<div className="flex flex-1 flex-col gap-1">
						<h3 className="text-sm leading-snug font-medium">
							{t('settings.account.signIn')}
						</h3>
						<p className="text-sm leading-normal text-muted-foreground">
							{t('settings.account.signInDescription')}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" disabled>
							{t('settings.account.signIn')}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AccountPage;
