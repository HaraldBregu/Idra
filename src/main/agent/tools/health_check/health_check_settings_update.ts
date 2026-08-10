import { z } from 'zod';
import { rescheduleHealth, updateHealthSettings } from '../../health';
import { tool } from '../tool';

export const updateHealthCheckSettingsTool = tool({
	id: 'health_check_settings_update',
	name: 'Health check settings update',
	description:
		'Update the health check run configuration. Only the provided fields change; the run schedule is refreshed automatically. Returns the resulting settings.',
	inputSchema: z.object({
		every: z
			.enum(['0m', '1m', '30m', '1h'])
			.optional()
			.describe("Run interval; '0m' disables the health check."),
		target: z.string().optional().describe("Target session: 'none', 'last', or a session id."),
		directPolicy: z.enum(['allow', 'block']).optional(),
		lightContext: z.boolean().optional(),
		isolatedSession: z.boolean().optional(),
		skipWhenBusy: z.boolean().optional().describe('Skip the check while the agent is busy.'),
		activeHours: z
			.object({ start: z.string(), end: z.string() })
			.optional()
			.describe('Only run between start and end (HH:MM times or YYYY-MM-DD dates).'),
		includeReasoning: z.boolean().optional(),
		providerId: z.string().optional(),
		modelId: z.string().optional(),
	}),
	execute: (patch) => {
		const next = updateHealthSettings(patch);
		rescheduleHealth();
		return next;
	},
});
