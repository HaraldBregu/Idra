import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AssistantPersona, type AssistantPersonaProps } from '@/components/persona';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { SettingsSection } from '../../components';

type PersonaState = NonNullable<AssistantPersonaProps['state']>;
type PersonaVariant = NonNullable<AssistantPersonaProps['variant']>;

const PERSONA_STATES = [
	'idle',
	'listening',
	'thinking',
	'speaking',
	'asleep',
] as const satisfies readonly PersonaState[];

const PERSONA_VARIANTS = [
	'obsidian',
	'command',
	'glint',
	'halo',
	'mana',
	'opal',
] as const satisfies readonly PersonaVariant[];

export function PersonaDemo(): React.JSX.Element {
	const { t } = useTranslation();
	const [state, setState] = useState<PersonaState>('idle');
	const [variant, setVariant] = useState<PersonaVariant>('obsidian');

	return (
		<SettingsSection
			title={t('settings.persona.title')}
			description={t('settings.persona.description')}
		>
			<Card size="sm" className="gap-0! overflow-hidden p-0!">
				<div className="grid sm:grid-cols-[minmax(11rem,0.7fr)_minmax(0,1fr)]">
					<div
						role="img"
						aria-label={t('settings.persona.previewLabel', { state, variant })}
						className="flex min-h-44 items-center justify-center border-b border-border/60 bg-muted/20 sm:min-h-52 sm:border-r sm:border-b-0"
					>
						<AssistantPersona state={state} variant={variant} className="size-32" />
					</div>

					<div className="flex min-w-0 flex-col">
						<div className="grid gap-2 border-b border-border/60 p-3">
							<Label htmlFor="persona-variant" className="text-xs">
								{t('settings.persona.variant')}
							</Label>
							<Select
								value={variant}
								onValueChange={(value) => {
									const nextVariant = PERSONA_VARIANTS.find((option) => option === value);
									if (nextVariant) setVariant(nextVariant);
								}}
							>
								<SelectTrigger id="persona-variant" size="sm" className="w-full text-xs">
									<SelectValue>{t(`settings.persona.variants.${variant}`)}</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{PERSONA_VARIANTS.map((option) => (
										<SelectItem key={option} value={option}>
											{t(`settings.persona.variants.${option}`)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<fieldset className="grid gap-2 p-3">
							<legend className="text-xs font-medium text-foreground">
								{t('settings.persona.state')}
							</legend>
							<div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
								{PERSONA_STATES.map((option) => (
									<Button
										key={option}
										type="button"
										variant={state === option ? 'secondary' : 'outline'}
										size="xs"
										aria-pressed={state === option}
										onClick={() => setState(option)}
									>
										{t(`settings.persona.states.${option}`)}
									</Button>
								))}
							</div>
						</fieldset>
					</div>
				</div>
			</Card>
		</SettingsSection>
	);
}
