import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';

import { Chat } from '@/components/chat';
import { Inspector } from '@/components/inspector';
import { LeftSidebar } from '@/components/left-sidebar';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useCoder } from '@/hooks/use-coder';
import { useTheme } from '@/hooks/use-theme';

export default function App() {
	useTheme();
	const coder = useCoder();

	return (
		<TooltipProvider>
			<main
				className="coder-shell"
				data-left-open={coder.leftOpen}
				data-right-open={coder.rightOpen}
				style={{
					gridTemplateColumns: `${coder.leftOpen ? '248px' : '0px'} minmax(320px, 1fr) ${coder.rightOpen ? '292px' : '0px'}`,
				}}
			>
				<aside className="coder-left" aria-label="Tasks and workspace">
					<LeftSidebar coder={coder} />
				</aside>

				<section className="coder-main">
					<header className="coder-toolbar">
						<div className="coder-toolbar-group">
							<Button
								variant="ghost"
								size="icon"
								aria-label={coder.leftOpen ? 'Hide left sidebar' : 'Show left sidebar'}
								onClick={() => coder.setLeftOpen(!coder.leftOpen)}
							>
								{coder.leftOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
							</Button>
							<div className="coder-title-block">
								<strong>{coder.activeSessionTitle}</strong>
								<span>{coder.workspaceName}</span>
							</div>
						</div>
						<div className="coder-toolbar-group">
							<span className={`coder-run-state coder-run-state--${coder.runState}`}>
								<span aria-hidden="true" />
								{coder.runLabel}
							</span>
							<Button
								variant="ghost"
								size="icon"
								aria-label={coder.rightOpen ? 'Hide right sidebar' : 'Show right sidebar'}
								onClick={() => coder.setRightOpen(!coder.rightOpen)}
							>
								{coder.rightOpen ? <PanelRightClose /> : <PanelRightOpen />}
							</Button>
						</div>
					</header>
					<Chat coder={coder} />
				</section>

				<aside className="coder-right" aria-label="Work inspector">
					<Inspector coder={coder} />
				</aside>
			</main>
		</TooltipProvider>
	);
}
