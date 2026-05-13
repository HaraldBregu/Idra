import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
	const rowClass =
		'flex min-h-[48px] w-full flex-wrap items-center gap-3 border-b border-border/70 px-6 py-1.5 text-sm last:border-b-0';
	const contentClass = 'flex min-w-0 flex-1 flex-col gap-1';
	const titleClass = 'text-sm leading-snug font-semibold';
	const descriptionClass = 'text-xs leading-normal text-muted-foreground';
	const actionsClass = 'ml-auto flex min-w-[180px] items-center justify-end gap-2 text-right';

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
			<section>
				<h2 className="mb-3 px-2 text-sm font-semibold text-muted-foreground">
					{t('settings.account.section')}
				</h2>

				<Card className="gap-0 py-0">
					<CardContent className="flex flex-col p-0">
						<div className={rowClass}>
							<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-input bg-background">
								<UserCircle className="h-4 w-4 text-muted-foreground" />
							</div>
							<div className={contentClass}>
								<h3 className={titleClass}>{displayName}</h3>
								<p className={descriptionClass}>{subtitle}</p>
							</div>
						</div>

						<div className={rowClass}>
							<div className={contentClass}>
								<h3 className={titleClass}>{t('settings.account.firstName')}</h3>
								<p className={descriptionClass}>{t('settings.account.editHint')}</p>
							</div>
							<div className={actionsClass}>
								<EditableName
									value={profile.firstName}
									editing={editing === 'firstName'}
									onStartEdit={() => setEditing('firstName')}
									onCommit={(v) => persist('firstName', v)}
									onCancel={() => setEditing(null)}
								/>
							</div>
						</div>

						<div className={rowClass}>
							<div className={contentClass}>
								<h3 className={titleClass}>{t('settings.account.lastName')}</h3>
								<p className={descriptionClass}>{t('settings.account.editHint')}</p>
							</div>
							<div className={actionsClass}>
								<EditableName
									value={profile.lastName}
									editing={editing === 'lastName'}
									onStartEdit={() => setEditing('lastName')}
									onCommit={(v) => persist('lastName', v)}
									onCancel={() => setEditing(null)}
								/>
							</div>
						</div>

						<div className={rowClass}>
							<div className={contentClass}>
								<h3 className={titleClass}>{t('settings.account.signIn')}</h3>
								<p className={descriptionClass}>{t('settings.account.signInDescription')}</p>
							</div>
							<div className={actionsClass}>
								<Button variant="outline" size="sm" disabled>
									{t('settings.account.signIn')}
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</section>
		</div>
	);
};

export default AccountPage;
