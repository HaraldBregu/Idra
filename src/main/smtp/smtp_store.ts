import type { SmtpProvider } from '../../shared/email_types';
import { getSmtpProvidersState, providersStorePath, setSmtpProvidersState } from '../providers/providers_index';

export const smtpStorePath = providersStorePath;

export function getSmtpSettings(): SmtpProvider | undefined {
	const providers = getSmtpProvidersState();
	return providers.find((provider) => provider.default) ?? providers[0];
}

export function getSmtpProviders(): SmtpProvider[] {
	return getSmtpProvidersState();
}

export function saveSmtpProvider(provider: SmtpProvider): void {
	setSmtpProvidersState( [
		...getSmtpProviders().map((entry) => ({ ...entry, default: false })),
		{ ...provider, default: true },
	]);
}

export function updateSmtpProvider(provider: SmtpProvider): void {
	const providers = getSmtpProviders();
	if (!providers.some((entry) => entry.id === provider.id)) throw new Error('Unknown SMTP provider.');
	setSmtpProvidersState( providers.map((entry) => (entry.id === provider.id ? provider : entry)));
}

export function selectSmtpProvider(providerId: string): void {
	if (!getSmtpProviders().some((provider) => provider.id === providerId)) {
		throw new Error('Unknown SMTP provider.');
	}
	setSmtpProvidersState( getSmtpProviders().map((provider) => ({
		...provider,
		default: provider.id === providerId,
	})));
}
