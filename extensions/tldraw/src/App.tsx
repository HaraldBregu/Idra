import { useState } from 'react';
import Canvas from './Canvas';
import Remote from './Remote';
import Session from './Session';
import { useFridayTheme } from './theme';

export default function App() {
	const [roomId, setRoomId] = useState<string | null>(null);
	const theme = useFridayTheme();
	const colorScheme = theme.isDark ? 'dark' : 'light';

	return (
		<main className="tldraw-extension">
			{roomId ? (
				<Remote colorScheme={colorScheme} roomId={roomId} />
			) : (
				<Canvas colorScheme={colorScheme} />
			)}
			<Session roomId={roomId} onJoin={setRoomId} onLeave={() => setRoomId(null)} />
		</main>
	);
}
