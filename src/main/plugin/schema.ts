import { z } from 'zod';
import { isPluginWidgetEntry } from './entry';

const idSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const versionSchema = z
	.string()
	.regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/);
const modelSchema = z
	.object({
		id: idSchema,
		name: z.string().trim().min(1),
	})
	.strict();
const providerSchema = z
	.object({
		id: idSchema,
		name: z.string().trim().min(1),
		protocol: z.literal('openai-compatible'),
		baseUrl: z.string().url(),
		models: z.array(modelSchema).min(1),
		apiKeyUrl: z.string().url().optional(),
	})
	.strict();
const widgetSchema = z
	.object({
		id: idSchema,
		title: z.string().trim().min(1),
		description: z.string().trim().min(1),
		category: z.string().trim().min(1),
		entry: z.string().refine(isPluginWidgetEntry),
		version: versionSchema.optional(),
	})
	.strict();
const contributionsSchema = z
	.object({
		providers: z.array(providerSchema).default([]),
		widgets: z.array(widgetSchema).default([]),
	})
	.strict()
	.superRefine((contributions, context) => {
		if (contributions.providers.length + contributions.widgets.length === 0) {
			context.addIssue({
				code: 'custom',
				message: 'A plugin must contribute at least one provider or widget.',
			});
		}
		for (const key of ['providers', 'widgets'] as const) {
			const ids = new Set<string>();
			contributions[key].forEach((contribution, index) => {
				if (ids.has(contribution.id)) {
					context.addIssue({
						code: 'custom',
						message: `Duplicate ${key.slice(0, -1)} id: ${contribution.id}`,
						path: [key, index, 'id'],
					});
				}
				ids.add(contribution.id);
			});
		}
	});

export const pluginManifestSchema = z
	.object({
		schemaVersion: z.literal(1),
		id: idSchema,
		name: z.string().trim().min(1),
		version: versionSchema,
		description: z.string().trim().min(1),
		contributes: contributionsSchema,
	})
	.strict();

export type PluginManifest = z.infer<typeof pluginManifestSchema>;
export type PluginProviderContribution = z.infer<typeof providerSchema>;
export type PluginWidgetContribution = z.infer<typeof widgetSchema>;
