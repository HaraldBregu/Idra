import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { EMPTY_CONNECTOR_FORM, parseConnectorForm, type ConnectorFormState } from './connector-form';

export function AddConnectorDialog({
	onAdd,
}: {
	readonly onAdd: (input: ReturnType<typeof parseConnectorForm>) => Promise<void>;
}): React.JSX.Element {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState<ConnectorFormState>(EMPTY_CONNECTOR_FORM);
	const [saving, setSaving] = useState(false);

	const update = (key: keyof ConnectorFormState, value: string): void => {
		setForm((current) => ({ ...current, [key]: value }));
	};

	const submit = async (): Promise<void> => {
		setSaving(true);
		try {
			await onAdd(parseConnectorForm(form));
			setForm(EMPTY_CONNECTOR_FORM);
			setOpen(false);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Button onClick={() => setOpen(true)}>
				<Plus className="size-4" />
				Add Connector
			</Button>
			<DialogContent className="max-w-2xl rounded-lg border border-border bg-background p-0 shadow-lg">
				<DialogHeader className="border-b border-border/70 p-5">
					<DialogTitle>Add Connector</DialogTitle>
					<DialogDescription>Connect an external tool provider to Friday.</DialogDescription>
				</DialogHeader>
				<div className="grid max-h-[70vh] gap-4 overflow-auto p-5">
					<div className="grid gap-2">
						<label className="text-xs font-medium">Connector type</label>
						<div className="grid gap-2 sm:grid-cols-2">
							<button
								type="button"
								className="rounded-lg border border-foreground/40 bg-muted/30 p-3 text-left text-sm"
							>
								<span className="block font-medium">MCP stdio connector</span>
								<span className="text-xs text-muted-foreground">Available now</span>
							</button>
							<button
								type="button"
								disabled
								className="rounded-lg border border-border bg-muted/20 p-3 text-left text-sm opacity-60"
							>
								<span className="block font-medium">MCP HTTP connector</span>
								<span className="text-xs text-muted-foreground">Coming soon</span>
							</button>
						</div>
					</div>
					<FormFields form={form} update={update} />
				</div>
				<DialogFooter className="border-t border-border/70 p-5">
					<Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
						Cancel
					</Button>
					<Button onClick={() => void submit()} disabled={saving}>
						Add Connector
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function FormFields({
	form,
	update,
}: {
	readonly form: ConnectorFormState;
	readonly update: (key: keyof ConnectorFormState, value: string) => void;
}): React.JSX.Element {
	return (
		<>
			<div className="grid gap-2">
				<label className="text-xs font-medium">Name</label>
				<Input value={form.name} onChange={(event) => update('name', event.target.value)} />
			</div>
			<div className="grid gap-2">
				<label className="text-xs font-medium">Command</label>
				<Input value={form.command} onChange={(event) => update('command', event.target.value)} />
			</div>
			<div className="grid gap-2">
				<label className="text-xs font-medium">Arguments</label>
				<Textarea
					value={form.args}
					onChange={(event) => update('args', event.target.value)}
					placeholder="One argument per line"
				/>
			</div>
			<div className="grid gap-2">
				<label className="text-xs font-medium">Environment variables</label>
				<Textarea
					value={form.env}
					onChange={(event) => update('env', event.target.value)}
					placeholder="KEY=value"
				/>
			</div>
			<div className="grid gap-2">
				<label className="text-xs font-medium">Working directory, optional</label>
				<Input value={form.cwd} onChange={(event) => update('cwd', event.target.value)} />
			</div>
		</>
	);
}
