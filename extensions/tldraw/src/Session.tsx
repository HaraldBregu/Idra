import { useState, type FormEvent } from 'react';

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
			<div className="session-panel" role="status">
				<span className="session-live" aria-hidden="true" />
				<span className="session-room" title={roomId}>Temporary room: {roomId}</span>
				<button
					type="button"
					onClick={() => {
						void navigator.clipboard
							.writeText(roomId)
							.then(() => setMessage('Room ID copied.'))
							.catch(() => setMessage('Could not copy the room ID.'));
					}}
				>
					Copy ID
				</button>
				<button type="button" onClick={onLeave}>Leave</button>
				<span className="session-message" aria-live="polite">{message}</span>
			</div>
		);
	}

	return (
		<div className="session-panel">
			<button type="button" onClick={() => setOpen((current) => !current)}>
				Temporary collaboration
			</button>
			{open && (
				<form className="session-dialog" onSubmit={join}>
					<strong>Join a temporary tldraw room</strong>
					<p>
						This opens a separate canvas. Rooms are public to anyone with the ID, expire after
						about 24 hours, and tldraw disables media uploads on its demo service.
					</p>
					<label htmlFor="room-id">Room ID</label>
					<input
						autoFocus
						id="room-id"
						value={value}
						onChange={(event) => setValue(event.target.value)}
						placeholder="friday-team-room"
					/>
					<span className="session-error" aria-live="polite">{message}</span>
					<div className="session-actions">
						<button type="button" onClick={() => setValue(`friday-${crypto.randomUUID()}`)}>
							Generate ID
						</button>
						<button type="submit">Join room</button>
					</div>
				</form>
			)}
		</div>
	);
}
