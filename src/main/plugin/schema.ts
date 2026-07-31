import { z } from 'zod';
import { isPluginExtensionEntry } from './entry';
import { isPluginPath } from './path';

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
	})
	.strict();
const providerInfoSchema = z
	.object({
		name: z.string().trim().min(1),
		protocol: z.literal('openai-compatible'),
		baseUrl: z.string().url(),
		apiKeyUrl: z.string().url().optional(),
	})
	.strict();
const providerModelsSchema = z.array(modelSchema).min(1);
const extensionSchema = z
	.object({
		id: idSchema,
		title: z.string().trim().min(1),
		description: z.string().trim().min(1),
		category: z.string().trim().min(1),
		entry: z
			.string()
			.refine(isPluginExtensionEntry)
			.refine((entry) => entry.startsWith('extensions/')),
		version: versionSchema.optional(),
	})
	.strict();
const skillSchema = z
	.object({
		id: idSchema,
		path: z
			.string()
			.refine(isPluginPath)
			.refine((path) => path.startsWith('skills/')),
	})
	.strict();
const mcpServerSchema = z.discriminatedUnion('type', [
	z
		.object({
			id: idSchema,
			name: z.string().trim().min(1).optional(),
			type: z.literal('http'),
			url: z.string().url(),
			requireApproval: z.enum(['always', 'never']).optional(),
		})
		.strict(),
	z
		.object({
			id: idSchema,
			name: z.string().trim().min(1).optional(),
			type: z.literal('stdio'),
			command: z.string().trim().min(1),
			args: z.array(z.string()).optional(),
			requireApproval: z.enum(['always', 'never']).optional(),
		})
		.strict(),
]);
const languageSchema = z
	.object({
		id: z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/),
		name: z.string().trim().min(1),
		entry: z
			.string()
			.refine(isPluginPath)
			.refine((entry) => entry.toLowerCase().endsWith('.json')),
	})
	.strict();
const themeSchema = z
	.object({
		id: idSchema,
		name: z.string().trim().min(1),
		entry: z
			.string()
			.refine(isPluginPath)
			.refine((entry) => entry.toLowerCase().endsWith('.json')),
	})
	.strict();
const channelSchema = z
	.object({
		id: idSchema,
		name: z.string().trim().min(1),
		description: z.string().trim().min(1),
		entry: z
			.string()
			.refine(isPluginPath)
			.refine((entry) => {
				const extension = entry.toLowerCase();
				return extension.endsWith('.js') || extension.endsWith('.mjs');
			}),
	})
	.strict();
const contributionsSchema = z
	.object({
		providers: z.array(providerSchema).default([]),
		skills: z.array(skillSchema).default([]),
		extensions: z.array(extensionSchema).default([]),
		mcpServers: z.array(mcpServerSchema).default([]),
		languages: z.array(languageSchema).default([]),
		themes: z.array(themeSchema).default([]),
		channels: z.array(channelSchema).default([]),
	})
	.strict()
	.superRefine((contributions, context) => {
		const contributionCount =
			contributions.providers.length +
			contributions.skills.length +
			contributions.extensions.length +
			contributions.mcpServers.length +
			contributions.languages.length +
			contributions.themes.length +
			contributions.channels.length;
		if (contributionCount === 0) {
			context.addIssue({
				code: 'custom',
				message: 'A plugin must contribute at least one extension.',
			});
		}
		for (const key of [
			'providers',
			'skills',
			'extensions',
			'mcpServers',
			'languages',
			'themes',
			'channels',
		] as const) {
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
		schemaVersion: z.literal(2),
		id: idSchema,
		name: z.string().trim().min(1),
		version: versionSchema,
		description: z.string().trim().min(1),
		contributes: contributionsSchema,
	})
	.strict();

export type PluginManifest = z.infer<typeof pluginManifestSchema>;
export type PluginProviderContribution = z.infer<typeof providerSchema>;
export type PluginSkillContribution = z.infer<typeof skillSchema>;
export type PluginExtensionContribution = z.infer<typeof extensionSchema>;
export type PluginMcpServerContribution = z.infer<typeof mcpServerSchema>;
export type PluginLanguageContribution = z.infer<typeof languageSchema>;
export type PluginThemeContribution = z.infer<typeof themeSchema>;
export type PluginChannelContribution = z.infer<typeof channelSchema>;
