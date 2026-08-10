import { useState } from 'react';
import Canvas from './Canvas';
import Remote from './Remote';
import Session from './Session';

export default function App() {
	const [roomId, setRoomId] = useState<string | null>(null);

	return (
		<main className="tldraw-extension">
			{roomId ? <Remote roomId={roomId} /> : <Canvas />}
			<Session roomId={roomId} onJoin={setRoomId} onLeave={() => setRoomId(null)} />
		</main>
	);
}
