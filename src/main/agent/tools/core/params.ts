import { ToolInputError } from './common';

type ParamOptions<TDefault> = {
	required?: boolean;
	defaultValue?: TDefault;
};

type StringOptions = ParamOptions<string> & {
	trim?: boolean;
	minLength?: number;
	maxLength?: number;
};

type NumberOptions = ParamOptions<number> & {
	min?: number;
	max?: number;
	integer?: boolean;
};

type BooleanOptions = ParamOptions<boolean>;

type StringArrayOptions = ParamOptions<string[]> & {
	allowEmpty?: boolean;
};

export function asParamsRecord(value: unknown): Record<string, unknown> {
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	throw new ToolInputError('Tool parameters must be a JSON object.', { received: typeof value });
}

export function coerceJsonObject(value: unknown): Record<string, unknown> {
	if (typeof value !== 'string') return asParamsRecord(value);
	const trimmed = value.trim();
	if (!trimmed) return {};
	try {
		return asParamsRecord(JSON.parse(trimmed));
	} catch (error) {
		throw new ToolInputError('Tool parameters must be valid JSON.', {
			message: error instanceof Error ? error.message : String(error),
		});
	}
}

function missing<T>(key: string, options?: ParamOptions<T>): T | undefined {
	if (options?.defaultValue !== undefined) return options.defaultValue;
	if (options?.required) throw new ToolInputError(`Missing required parameter: ${key}.`, { key });
	return undefined;
}

export function readStringParam(
	params: Record<string, unknown>,
	key: string,
	options: StringOptions = {}
): string | undefined {
	const value = params[key];
	if (value === undefined || value === null) return missing(key, options);
	if (typeof value !== 'string') {
		throw new ToolInputError(`Parameter ${key} must be a string.`, { key, received: typeof value });
	}
	const next = options.trim === false ? value : value.trim();
	if (options.minLength !== undefined && next.length < options.minLength) {
		throw new ToolInputError(`Parameter ${key} must be at least ${options.minLength} characters.`, {
			key,
		});
	}
	if (options.maxLength !== undefined && next.length > options.maxLength) {
		throw new ToolInputError(`Parameter ${key} must be at most ${options.maxLength} characters.`, {
			key,
		});
	}
	return next;
}

export function readNumberParam(
	params: Record<string, unknown>,
	key: string,
	options: NumberOptions = {}
): number | undefined {
	const value = params[key];
	if (value === undefined || value === null) return missing(key, options);
	const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
	if (!Number.isFinite(numberValue)) {
		throw new ToolInputError(`Parameter ${key} must be a number.`, { key, received: typeof value });
	}
	if (options.integer && !Number.isInteger(numberValue)) {
		throw new ToolInputError(`Parameter ${key} must be an integer.`, { key });
	}
	if (options.min !== undefined && numberValue < options.min) {
		throw new ToolInputError(`Parameter ${key} must be at least ${options.min}.`, { key });
	}
	if (options.max !== undefined && numberValue > options.max) {
		throw new ToolInputError(`Parameter ${key} must be at most ${options.max}.`, { key });
	}
	return numberValue;
}

export function readBooleanParam(
	params: Record<string, unknown>,
	key: string,
	options: BooleanOptions = {}
): boolean | undefined {
	const value = params[key];
	if (value === undefined || value === null) return missing(key, options);
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (normalized === 'true') return true;
		if (normalized === 'false') return false;
	}
	throw new ToolInputError(`Parameter ${key} must be a boolean.`, { key, received: typeof value });
}

export function readStringArrayParam(
	params: Record<string, unknown>,
	key: string,
	options: StringArrayOptions = {}
): string[] | undefined {
	const value = params[key];
	if (value === undefined || value === null) return missing(key, options);
	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
		throw new ToolInputError(`Parameter ${key} must be an array of strings.`, { key });
	}
	const next = value.map((entry) => entry.trim()).filter(Boolean);
	if (next.length === 0 && options.allowEmpty === false) {
		throw new ToolInputError(`Parameter ${key} must include at least one string.`, { key });
	}
	return next;
}

export function readEnumParam<TAllowed extends string>(
	params: Record<string, unknown>,
	key: string,
	allowed: readonly TAllowed[],
	options: ParamOptions<TAllowed> = {}
): TAllowed | undefined {
	const value = params[key];
	if (value === undefined || value === null) return missing(key, options);
	if (typeof value !== 'string' || !allowed.includes(value as TAllowed)) {
		throw new ToolInputError(`Parameter ${key} must be one of: ${allowed.join(', ')}.`, {
			key,
			allowed,
		});
	}
	return value as TAllowed;
}

