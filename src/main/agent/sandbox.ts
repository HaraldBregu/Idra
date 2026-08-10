import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
	SandboxManager,
	VENDORED_SRT_WIN_EXE,
	installWindowsSandboxAsync,
	resolveSrtWin,
	type SandboxRuntimeConfig,
} from '@anthropic-ai/sandbox-runtime';
import type { ChildProcess } from 'node:child_process';
import type { SandboxStatus } from '../../shared/sandbox';
import { getPermissions } from './agent_store';
import { userDataLocation } from '../shared/user_data_location';
import { realPath } from '../shared/real_path';
import { resolveUserPath } from '../shared/user_path';
import { isPathWithin } from './permissions/permissions_path';

export interface SandboxedCommand {
	command: string;
	args: string[];
	env: NodeJS.ProcessEnv;
	commandId: string;
}

export class ExecSandbox {
	private fingerprint: string | undefined;
	private transition: Promise<void> = Promise.resolve();
	private readonly children = new Set<ChildProcess>();
	private readonly temporaryDirectory = path.join(userDataLocation(), 'sandbox');

	async wrap(
		command: string,
		cwd: string,
		commandId: string,
		signal?: AbortSignal
	): Promise<SandboxedCommand> {
		await this.ensureReady();
		const wrapped = await SandboxManager.wrapWithSandboxArgv(
			command,
			process.platform === 'win32' ? undefined : '/bin/sh',
			undefined,
			signal,
			cwd,
			{ commandId, commandText: command }
		);
		return {
			command: wrapped.argv[0],
			args: wrapped.argv.slice(1),
			env: {
				...wrapped.env,
				TMPDIR: this.temporaryDirectory,
				TMP: this.temporaryDirectory,
				TEMP: this.temporaryDirectory,
			},
			commandId,
		};
	}

	track(child: ChildProcess): void {
		this.children.add(child);
		child.once('close', () => this.children.delete(child));
	}

	annotate(commandId: string, stderr: string): string {
		const annotated = SandboxManager.annotateStderrWithSandboxFailures(commandId, stderr);
		if (annotated !== stderr) {
			return `${annotated}\nA sandbox restriction blocked this operation. Retry with elevated: true to request host execution.`;
		}
		if (/operation not permitted|permission denied|\bEPERM\b/i.test(stderr)) {
			return `${stderr}\nA filesystem sandbox may have blocked this operation. Retry with elevated: true to request host execution.`;
		}
		return stderr;
	}

	cleanup(): void {
		SandboxManager.cleanupAfterCommand();
	}

	async status(): Promise<SandboxStatus> {
		if (!SandboxManager.isSupportedPlatform()) {
			return {
				state: 'unavailable',
				platform: process.platform,
				message: `Command sandboxing is unavailable on ${process.platform}.`,
			};
		}
		try {
			const dependencies =
				process.platform === 'win32'
					? await import('@anthropic-ai/sandbox-runtime').then(({ checkWindowsDependenciesAsync }) =>
							checkWindowsDependenciesAsync({
								srtWin: resolveSrtWin({ path: this.vendoredWindowsPath() }),
							})
						)
					: await SandboxManager.checkDependenciesAsync();
			if (dependencies.errors.length > 0) {
				return {
					state: process.platform === 'win32' ? 'setup_required' : 'unavailable',
					platform: process.platform,
					message: [...dependencies.errors, ...dependencies.warnings].join('\n'),
				};
			}
			return { state: 'ready', platform: process.platform };
		} catch (error) {
			return {
				state: process.platform === 'win32' ? 'setup_required' : 'unavailable',
				platform: process.platform,
				message: error instanceof Error ? error.message : String(error),
			};
		}
	}

	async setup(): Promise<SandboxStatus> {
		if (process.platform !== 'win32') return this.status();
		const srtWin = resolveSrtWin({ path: this.vendoredWindowsPath() });
		const result = await installWindowsSandboxAsync({ srtWin });
		if (result.cancelled) {
			return {
				state: 'setup_required',
				platform: process.platform,
				message: 'Windows sandbox setup was cancelled.',
			};
		}
		await this.invalidate();
		return this.status();
	}

	async invalidate(): Promise<void> {
		await this.stopChildren();
		this.fingerprint = undefined;
		await SandboxManager.reset();
	}

	async reset(): Promise<void> {
		await this.invalidate();
	}

	private async ensureReady(): Promise<void> {
		const { config, fingerprint } = await this.configuration();
		if (this.fingerprint === fingerprint && SandboxManager.isSandboxingEnabled()) return;
		const previous = this.transition;
		let release: (() => void) | undefined;
		this.transition = new Promise<void>((resolve) => {
			release = resolve;
		});
		await previous;
		try {
			if (this.fingerprint === fingerprint && SandboxManager.isSandboxingEnabled()) return;
			if (!SandboxManager.isSupportedPlatform()) {
				throw new Error(`Command sandboxing is unavailable on ${process.platform}.`);
			}
			await fs.mkdir(this.temporaryDirectory, { recursive: true });
			if (SandboxManager.isSandboxingEnabled()) {
				await this.stopChildren();
				await SandboxManager.reset();
			}
			await SandboxManager.initialize(config);
			this.fingerprint = fingerprint;
		} finally {
			release?.();
		}
	}

	private async configuration(): Promise<{
		config: SandboxRuntimeConfig;
		fingerprint: string;
	}> {
		const candidates = getPermissions().directories
			.filter(
				(permission) =>
					permission.enabled &&
					permission.recoursive &&
					(permission.tools === '*' || permission.tools.includes('exec_command'))
			)
			.map((permission) => realPath(resolveUserPath(permission.path, os.homedir())));
		const existing = await Promise.all(
			candidates.map(async (candidate) => {
				try {
					return (await fs.stat(candidate)).isDirectory() ? candidate : undefined;
				} catch {
					return undefined;
				}
			})
		);
		const roots = [...new Set(existing.filter((value): value is string => !!value))]
			.sort((a, b) => a.length - b.length)
			.filter((candidate, index, values) =>
				values.slice(0, index).every((parent) => !isPathWithin(parent, candidate))
			);
		const allowWrite = [...roots, this.temporaryDirectory];
		const windowsPath = this.vendoredWindowsPath();
		const seccompPath = this.vendoredSeccompPath();
		const config: SandboxRuntimeConfig = {
			network: {
				allowedDomains: ['*'],
				deniedDomains: [],
				allowLocalBinding: true,
				allowUnixSockets: [],
				allowAllUnixSockets: false,
			},
			filesystem: {
				denyRead: [],
				allowRead: [],
				allowWrite,
				denyWrite: [],
			},
			enableWeakerNestedSandbox: false,
			enableWeakerNetworkIsolation: false,
			allowAppleEvents: false,
			allowPty: true,
			...(process.platform === 'win32'
				? { windows: { srtWin: { path: windowsPath } } }
				: {}),
			...(process.platform === 'linux' ? { seccomp: { applyPath: seccompPath } } : {}),
		};
		return { config, fingerprint: JSON.stringify(allowWrite) };
	}

	private vendoredWindowsPath(): string {
		return this.unpackedPath(VENDORED_SRT_WIN_EXE);
	}

	private vendoredSeccompPath(): string {
		return this.unpackedPath(
			path.resolve(
				path.dirname(VENDORED_SRT_WIN_EXE),
				'..',
				'..',
				'seccomp',
				process.arch,
				'apply-seccomp'
			)
		);
	}

	private unpackedPath(value: string): string {
		return value.replace(
			`${path.sep}app.asar${path.sep}`,
			`${path.sep}app.asar.unpacked${path.sep}`
		);
	}

	private async stopChildren(): Promise<void> {
		const children = [...this.children];
		await Promise.all(
			children.map(
				(child) =>
					new Promise<void>((resolve) => {
						if (child.exitCode !== null || child.signalCode !== null) {
							resolve();
							return;
						}
						const timer = setTimeout(resolve, 2_000);
						child.once('close', () => {
							clearTimeout(timer);
							resolve();
						});
						child.kill('SIGTERM');
					})
			)
		);
		this.children.clear();
	}
}
