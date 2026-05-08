import type { ComponentType } from 'react';
import { ShortcutId } from '../../../../../../shared/shortcuts';
import type { CommandModalId } from '../context/CommandModalContext';
import { DocumentCommandModal } from '../modals/DocumentCommandModal';

export interface CommandModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

interface CommandModalDefinition {
	id: CommandModalId;
	shortcutId?: ShortcutId;
	Component: ComponentType<CommandModalProps>;
}

export const COMMAND_MODAL_DEFINITIONS: CommandModalDefinition[] = [
	{
		id: 'documents',
		shortcutId: ShortcutId.openDocumentList,
		Component: DocumentCommandModal,
	},
];

export const SHORTCUT_TO_COMMAND_MODAL = COMMAND_MODAL_DEFINITIONS.reduce<
	Partial<Record<ShortcutId, CommandModalId>>
>((acc, definition) => {
	if (definition.shortcutId) {
		acc[definition.shortcutId] = definition.id;
	}
	return acc;
}, {});
