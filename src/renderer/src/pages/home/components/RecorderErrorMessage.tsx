import { type ReactElement } from 'react';
import { AlertCircle } from 'lucide-react';

export function RecorderErrorMessage({
	message,
}: {
	readonly message: string | null;
}): ReactElement | null {
	if (!message) return null;

	return (
		<div className="mb-2 flex min-w-0 items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive shadow-sm">
			<AlertCircle className="size-4 shrink-0" />
			<p className="min-w-0 truncate text-xs font-medium">{message}</p>
		</div>
	);
}
