import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Tool } from '../core/tool';
import { resolveToolPath } from './resolve';

interface FindResult {
	root: string;
	pattern: string;
	count: number;
	truncated: boolean;
	matches: string[];
}

export class FindTool extends Tool {
	readonly name = 'find';
	readonly description =
		'Recursively find files by name or relative path pattern. Use this to locate files before reading or editing them.';
	readonly schema = {
		type: 'object',
		properties: {
			pattern: {
				type: 'string',
				description:
					'File name or path pattern to find. Supports * and ? wildcards; plain text matches file names and relative paths case-insensitively.',
			},
			path: {
				type: 'string',
				description:
					'Directory to search. Relative paths resolve from the workspace; ~ expands to the user home. Defaults to the workspace.',
			},
			maxResults: {
				type: 'number',
				description: 'Maximum number of matches to return (default 200).',
			},
		},
		required: ['pattern'],
		additionalProperties: false,
	};

	constructor(private readonly basePath = process.cwd()) {
		super();
	}

	async run(input: Record<string, unknown>): Promise<FindResult> {
		const pattern = input.pattern;
		const searchPath = input.path;
		const maxResultsInput = input.maxResults;
		if (typeof pattern !== 'string' || !pattern.trim()) {
			throw new Error('find requires a non-empty pattern.');
		}
		if (
			searchPath !== undefined &&
			(typeof searchPath !== 'string' || !searchPath.trim())
		) {
			throw new Error('find path must be a non-empty string.');
		}
		if (
			maxResultsInput !== undefined &&
			(typeof maxResultsInput !== 'number' ||
				!Number.isInteger(maxResultsInput) ||
				maxResultsInput <= 0)
		) {
			throw new Error('find maxResults must be a positive integer.');
		}

		const root = resolveToolPath(this.basePath, searchPath ?? '.');
		const maxResults = maxResultsInput ?? 200;
		const normalizedPattern = pattern.trim().replaceAll('\\', '/');
		const hasWildcard = /[*?]/.test(normalizedPattern);
		const regexPattern = normalizedPattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
		const wildcardRegex = new RegExp(
			`^${regexPattern.replace(/\*/g, '.*').replace(/\?/g, '.')}$`,
			'i'
		);
		const matches: string[] = [];
		const stack = [root];

		while (stack.length > 0 && matches.length < maxResults) {
			const current = stack.pop();
			if (!current) continue;

			let entries: Dirent[];
			try {
				entries = await fs.readdir(current, { withFileTypes: true });
			} catch {
				continue;
			}

			for (const entry of entries) {
				const fullPath = path.join(current, entry.name);
				if (entry.isDirectory()) {
					stack.push(fullPath);
					continue;
				}
				if (!entry.isFile()) continue;

				const relativePath = path.relative(root, fullPath).split(path.sep).join('/');
				const fileName = path.basename(relativePath);
				const target = normalizedPattern.includes('/') ? relativePath : fileName;
				const found = hasWildcard
					? wildcardRegex.test(target)
					: fileName.toLowerCase().includes(normalizedPattern.toLowerCase()) ||
						relativePath.toLowerCase().includes(normalizedPattern.toLowerCase());
				if (!found) continue;

				matches.push(fullPath);
				if (matches.length >= maxResults) break;
			}
		}

		matches.sort();
		return {
			root,
			pattern: normalizedPattern,
			count: matches.length,
			truncated: matches.length >= maxResults,
			matches,
		};
	}
}
