import { ArrowRight, Copy, Dices, LogOut, Users, Wifi } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface SessionProps {
	roomId: string | null;
	onJoin: (roomId: string) => void;
	onLeave: () => void;
}

export default function Session({ roomId, onJoin, onLeave }: SessionProps) {
	const [open, setOpen] = useState(false);
	const [value, setValue] = useState('');
	const [message, setMessage] = useState('');

	const join = (event: FormEvent): void => {
		event.preventDefault();
		const nextRoomId = value.trim();
		if (!/^[a-z0-9_-]{3,100}$/i.test(nextRoomId)) {
			setMessage('Use 3–100 letters, numbers, hyphens, or underscores.');
			return;
		}
		setMessage('');
		setOpen(false);
		onJoin(nextRoomId);
	};

	if (roomId) {
		return (
			<section
				aria-label="Temporary collaboration room"
				className="session-shell flex max-w-[calc(100%-2rem)] items-center gap-1 rounded-lg border border-border bg-background p-1 text-foreground shadow-md"
			>
				<div className="flex min-w-0 items-center gap-2 px-2 text-xs font-medium">
					<Wifi aria-hidden="true" className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
					<span className="max-w-48 truncate" title={roomId}>{roomId}</span>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => {
						void navigator.clipboard
							.writeText(roomId)
							.then(() => setMessage('Room ID copied.'))
							.catch(() => setMessage('Could not copy the room ID.'));
					}}
				>
					<Copy aria-hidden="true" />
					Copy
				</Button>
				<Button type="button" variant="ghost" size="sm" onClick={onLeave}>
					<LogOut aria-hidden="true" />
					Leave
				</Button>
				<span className="sr-only" aria-live="polite">{message}</span>
			</section>
		);
	}

	return (
		<div className="session-shell">
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button type="button" variant="outline" size="sm" className="shadow-md">
						<Users aria-hidden="true" />
						Collaborate
					</Button>
				</DialogTrigger>
				<DialogContent>
					<form className="grid gap-4" onSubmit={join}>
						<DialogHeader>
							<DialogTitle>
								<Users aria-hidden="true" className="size-5" />
								Temporary collaboration
							</DialogTitle>
							<DialogDescription>
								This opens a separate public canvas. Anyone with the room ID can join. Demo
								rooms expire after about 24 hours and do not support media uploads.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-2">
							<label className="text-sm font-medium" htmlFor="room-id">Room ID</label>
							<Input
								autoFocus
								aria-describedby={message ? 'room-error' : undefined}
								aria-invalid={Boolean(message)}
								id="room-id"
								value={value}
								onChange={(event) => {
									setValue(event.target.value);
									setMessage('');
								}}
								placeholder="friday-team-room"
							/>
							{message && (
								<p id="room-error" className="text-xs text-destructive" aria-live="polite">
									{message}
								</p>
							)}
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="secondary"
								onClick={() => {
									setValue(`friday-${crypto.randomUUID()}`);
									setMessage('');
								}}
							>
								<Dices aria-hidden="true" />
								Generate ID
							</Button>
							<Button type="submit">
								Join room
								<ArrowRight aria-hidden="true" />
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
