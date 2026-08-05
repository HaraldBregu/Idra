import { LlmModel } from '../models/adapters/llm';
import { getProvider } from '../app/settings_store';
import type { WikiSettings } from '../../shared/wiki_types';
import { parseWikiUpdate } from './wiki_parse_update';
import { wikiSourcePage } from './wiki_source_page';
import type { WikiSource, WikiUpdate } from './wiki_types';

const wikiModel = new LlmModel();

export async function generateWikiUpdate(
	settings: WikiSettings,
	source: WikiSource,
	context: string
): Promise<WikiUpdate> {
	const provider = getProvider(settings.providerId);
	if (!provider) throw new Error(`Provider not configured: ${settings.providerId}`);
	const sourcePage = wikiSourcePage(source);
	const response = await wikiModel.generate({
		provider: {
			id: settings.providerId,
			apiKey: provider.apiKey,
			baseURL: provider.baseUrl,
		},
		model: settings.modelId,
		maxTokens: 12_000,
		systemPrompt:
			'You maintain a persistent personal wiki. Raw sources are immutable. Integrate new facts into durable, concise, interlinked Markdown pages. Preserve useful existing material, record source provenance, surface contradictions instead of silently resolving them, and use Obsidian [[Page links]]. Return changes only by calling apply_wiki_update.',
		messages: [
			{
				role: 'user',
				content: `Ingest the source below into the current wiki.

Required source summary page: ${sourcePage}
The source summary must cite the raw source path "${source.relativePath}" and explain its key claims.
Create or replace complete page bodies for every affected entity, concept, comparison, or synthesis page.
Do not include YAML frontmatter or an H1 in content; the application adds those.
Use sections such as Evidence, Connections, Contradictions and open questions when relevant.
Every page must list all raw source paths used in its sources field.

<wiki-context>
${context}
</wiki-context>

<raw-source path="${source.relativePath}">
${source.content}
</raw-source>`,
			},
		],
		tools: [
			{
				name: 'apply_wiki_update',
				description: 'Apply a complete, validated set of Markdown page updates to the wiki.',
				run: (input) => input,
				schema: {
					type: 'object',
					additionalProperties: false,
					required: ['pages'],
					properties: {
						pages: {
							type: 'array',
							minItems: 1,
							maxItems: 24,
							items: {
								type: 'object',
								additionalProperties: false,
								required: ['path', 'title', 'summary', 'content', 'sources'],
								properties: {
									path: { type: 'string' },
									title: { type: 'string' },
									summary: { type: 'string' },
									content: { type: 'string' },
									sources: { type: 'array', items: { type: 'string' } },
								},
							},
						},
					},
				},
			},
		],
	});
	const toolCall = response.toolCalls?.find((call) => call.name === 'apply_wiki_update');
	if (!toolCall) throw new Error('The selected model did not return a wiki update.');
	return parseWikiUpdate(toolCall.args, sourcePage);
}
