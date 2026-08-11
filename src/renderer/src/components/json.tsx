import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface JsonOptionProps {
	readonly label: string;
	readonly value: unknown;
	readonly onChange: (value: unknown) => void;
}

export function JsonOption({ label, value, onChange }: JsonOptionProps): React.JSX.Element {
	const [text, setText] = useState(value === undefined ? '' : JSON.stringify(value, null, 2));
	const [invalid, setInvalid] = useState(false);

	return (
		<Textarea
			aria-label={label}
			aria-invalid={invalid}
			className="min-h-20 w-64 max-w-full resize-y font-mono text-xs"
			placeholder="Provider default"
			value={text}
			onChange={(event) => {
				const next = event.target.value;
				setText(next);
				if (next.trim() === '') {
					setInvalid(false);
					onChange(undefined);
					return;
				}
				try {
					onChange(JSON.parse(next));
					setInvalid(false);
				} catch {
					setInvalid(true);
				}
			}}
		/>
	);
}
