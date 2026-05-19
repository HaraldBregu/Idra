import { DomeWaveAnimation } from '@/components/ui/dome-wave-animation';

export function TrayApp(): React.JSX.Element {
	return (
		<main className="tray-app" aria-label="Friday tray wave">
			<DomeWaveAnimation height={72} className="tray-wave" />
		</main>
	);
}
