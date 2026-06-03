import { objectSchema, stringArraySchema, type RequestedTool } from './shared';

const searchRequestSchema = {
	type: 'array',
	items: objectSchema({
		q: { type: 'string' },
		recency: { type: 'number' },
		domains: stringArraySchema,
	}, ['q']),
};

const pageRefSchema = {
	type: 'array',
	items: objectSchema({
		ref_id: { type: 'string' },
		lineno: { type: 'number' },
	}, ['ref_id']),
};

export const webRunTool = {
	name: 'web.run',
	description:
		'Accesses the internet for search, page reading, link navigation, page text lookup, PDF screenshots, image search, finance, weather, sports, and time queries.',
	schema: objectSchema({
		search_query: searchRequestSchema,
		image_query: searchRequestSchema,
		open: pageRefSchema,
		click: {
			type: 'array',
			items: objectSchema({
				ref_id: { type: 'string' },
				id: { type: 'number' },
			}, ['ref_id', 'id']),
		},
		find: {
			type: 'array',
			items: objectSchema({
				ref_id: { type: 'string' },
				pattern: { type: 'string' },
			}, ['ref_id', 'pattern']),
		},
		screenshot: {
			type: 'array',
			items: objectSchema({
				ref_id: { type: 'string' },
				pageno: { type: 'number' },
			}, ['ref_id', 'pageno']),
		},
		finance: {
			type: 'array',
			items: objectSchema({
				ticker: { type: 'string' },
				type: { type: 'string', enum: ['equity', 'fund', 'crypto', 'index'] },
				market: { type: 'string' },
			}, ['ticker', 'type']),
		},
		weather: {
			type: 'array',
			items: objectSchema({
				location: { type: 'string' },
				start: { type: 'string' },
				duration: { type: 'number' },
			}, ['location']),
		},
		sports: {
			type: 'array',
			items: objectSchema({
				tool: { type: 'string', enum: ['sports'] },
				fn: { type: 'string', enum: ['schedule', 'standings'] },
				league: {
					type: 'string',
					enum: ['nba', 'wnba', 'nfl', 'nhl', 'mlb', 'epl', 'ncaamb', 'ncaawb', 'ipl'],
				},
				team: { type: 'string' },
				opponent: { type: 'string' },
				date_from: { type: 'string' },
				date_to: { type: 'string' },
				num_games: { type: 'number' },
				locale: { type: 'string' },
			}, ['tool', 'fn', 'league']),
		},
		time: {
			type: 'array',
			items: objectSchema({ utc_offset: { type: 'string' } }, ['utc_offset']),
		},
		response_length: { type: 'string', enum: ['short', 'medium', 'long'] },
	}),
} as const satisfies RequestedTool;
