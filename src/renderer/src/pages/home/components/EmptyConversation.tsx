import { type ReactElement } from 'react';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { GradientSphere } from '@/components/ui/gradient-sphere';

export function EmptyConversation(): ReactElement {
	return (
		<Empty className="mx-auto max-w-sm border-0 p-0">
			<EmptyHeader>
				<EmptyMedia className="mt-8">
					<GradientSphere size={72} />
				</EmptyMedia>
				<EmptyTitle>Start a conversation</EmptyTitle>
				<EmptyDescription>
					Ask Friday to inspect code, make a change, or help plan the next step.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}
