import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Persona, type PersonaState } from '@/components/persona';
import { Button } from '@/components/ui/button';
import {
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../../components';

const PERSONA_STATES: readonly PersonaState[] = ['idle', 'listening', 'thinking', 'speaking'];

const PersonaPage: React.FC = () => {
	const { t } = useTranslation();
	const [state, setState] = useState<PersonaState>('idle');
	const [listeningLevel, setListeningLevel] = useState(0.28);

	useEffect(() => {
		if (state !== 'listening') return;

		const interval = window.setInterval(() => {
			setListeningLevel((currentLevel) => {
				const targetLevel = Math.random() < 0.18 ? 0.06 : 0.2 + Math.random() * 0.58;
				return currentLevel + (targetLevel - currentLevel) * 0.45;
			});
		}, 1200);

		return () => window.clearInterval(interval);
	}, [state]);

	const level = state === 'listening' ? listeningLevel : state === 'speaking' ? 0.72 : 0.16;

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.persona.title')}
				description={t('settings.persona.description')}
			/>

			<SettingsSection
				title={t('settings.persona.preview')}
				description={t('settings.persona.previewDescription')}
			>
				<SettingsPanel className="overflow-hidden">
					<div className="flex min-h-96 flex-col items-center justify-center gap-4 bg-neutral-950 p-6">
						<Persona state={state} level={level} />
						<div className="flex flex-wrap items-center justify-center gap-1.5">
							{PERSONA_STATES.map((personaState) => (
								<Button
									key={personaState}
									type="button"
									variant={state === personaState ? 'secondary' : 'ghost'}
									size="xs"
									aria-pressed={state === personaState}
									className="text-neutral-300 hover:bg-white/10 hover:text-white"
									onClick={() => setState(personaState)}
								>
									{t(`settings.persona.states.${personaState}`)}
								</Button>
							))}
						</div>
					</div>
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default PersonaPage;
