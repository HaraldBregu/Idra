import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/Dialog';
import type { ConnectorConfig, ConnectorUpdateInput } from '../../../../../shared/connectors';
import { argsToText, envToText, parseConnectorForm, type ConnectorFormState } from './connector-form';
import { FormFields } from './AddConnectorDialog';

export function EditConnectorDialog({
	connector,
	open,
	onOpenChange,
	onSave,
}: {
	readonly connector: ConnectorConfig | null;
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly onSave: (id: string, input: ConnectorUpdateInput) => Promise<void>;
}): React.JSX.Element {
	const [form, setForm] = useState<ConnectorFormState>({
		name: '',
		command: '',
		args: '',
		env: '',
		cwd: '',
	});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!connector) return;
		setForm({
			name: connector.name,
			command: connector.command,
			args: argsToText(connector.args),
			env: envToText(connector.env),
			cwd: connector.cwd ?? '',
		});
	}, [connector]);

	const update = (key: keyof ConnectorFormState, value: string): void => {
		setForm((current) => ({ ...current, [key]: value }));
	};

	const submit = async (): Promise<void> => {
		if (!connector) return;
		setSaving(true);
		try {
			await onSave(connector.id, parseConnectorForm(form));
			onOpenChange(false);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl rounded-lg border border-border bg-background p-0 shadow-lg">
				<DialogHeader className="border-b border-border/70 p-5">
					<DialogTitle>Edit Connector</DialogTitle>
				</DialogHeader>
				<div className="grid max-h-[70vh] gap-4 overflow-auto p-5">
					<FormFields form={form} update={update} />
				</div>
				<DialogFooter className="border-t border-border/70 p-5">
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
						Cancel
					</Button>
					<Button onClick={() => void submit()} disabled={saving}>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
