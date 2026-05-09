import React from 'react';

const AssistantConfigPage: React.FC = () => {
	return (
		<main className="flex h-full min-h-0 items-center justify-center bg-background px-6">
			<section className="w-full max-w-2xl space-y-4 text-center">
				<p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Friday</p>
				<h1 className="text-4xl font-semibold tracking-normal text-foreground">Assistant Config</h1>
				<p className="text-base text-muted-foreground">Configure your assistant settings.</p>
			</section>
		</main>
	);
};

export default AssistantConfigPage;
