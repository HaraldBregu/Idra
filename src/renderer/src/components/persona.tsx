import type { ComponentProps } from 'react';
import { Persona as PersonaPrimitive, type PersonaState } from '@/components/ai-elements/persona';

export type AssistantPersonaProps = Omit<ComponentProps<typeof PersonaPrimitive>, 'state'> & {
	readonly state?: PersonaState;
};

export function AssistantPersona({
	state = 'idle',
	...props
}: AssistantPersonaProps): React.JSX.Element {
	return <PersonaPrimitive state={state} {...props} />;
}
