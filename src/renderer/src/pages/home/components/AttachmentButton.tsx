import { type ReactElement } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PromptInputAction, usePromptInput } from '@/components/ui/prompt-input';

export function AttachmentButton(): ReactElement {
	const { triggerFileUpload } = usePromptInput();
	return (
		<PromptInputAction tooltip="Add attachment">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
				aria-label="Add attachment"
				onClick={triggerFileUpload}
			>
				<Plus className="size-4" />
			</Button>
		</PromptInputAction>
	);
}
