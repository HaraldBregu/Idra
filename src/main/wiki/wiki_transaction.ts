import { cp, mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { getWikiRepository, type WikiRepository } from './wiki_repository';
import { validateWiki } from './wiki_validate';

export interface WikiTransactionInput<T> {
	targetPath: string;
	operationId: string;
	repository?: WikiRepository;
	apply(stagedPath: string): Promise<T>;
	validate?(stagedPath: string): Promise<string[]>;
}

export async function transactWiki<T>(input: WikiTransactionInput<T>): Promise<T> {
	const parent = path.dirname(input.targetPath);
	await mkdir(parent, { recursive: true });
	const transactionRoot = await mkdtemp(path.resolve(parent, `.wiki-${input.operationId}-`));
	const stagedPath = path.resolve(transactionRoot, 'wiki');
	const backupPath = path.resolve(transactionRoot, 'backup');
	const targetExists = await stat(input.targetPath)
		.then((value) => value.isDirectory())
		.catch(() => false);
	try {
		if (targetExists) await cp(input.targetPath, stagedPath, { recursive: true, force: false });
		else await mkdir(stagedPath, { recursive: true });
		const result = await input.apply(stagedPath);
		const errors = await (input.validate
			? input.validate(stagedPath)
			: validateWiki(stagedPath, input.repository ?? getWikiRepository(input.targetPath)));
		if (errors.length > 0) throw new Error(`Wiki validation failed: ${errors.join('; ')}`);
		if (targetExists) await rename(input.targetPath, backupPath);
		try {
			await rename(stagedPath, input.targetPath);
		} catch (error) {
			if (targetExists) await rename(backupPath, input.targetPath).catch(() => undefined);
			throw error;
		}
		if (targetExists) await rm(backupPath, { recursive: true, force: true });
		return result;
	} finally {
		await rm(transactionRoot, { recursive: true, force: true }).catch(() => undefined);
	}
}
