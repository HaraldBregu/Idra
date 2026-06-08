import type { RuntimeModel } from '../loop/types';
import type { Settings } from '../settings/settings';
import type { SystemPrompt } from '../prompt/prompt';
import type { Workspace } from '../workspace/workspace';
import { createToken } from './token';

export const WORKSPACE = createToken<Workspace>('Workspace');
export const SETTINGS = createToken<Settings>('Settings');
export const MODEL = createToken<RuntimeModel>('RuntimeModel');
export const SYSTEM_PROMPT = createToken<SystemPrompt>('SystemPrompt');
