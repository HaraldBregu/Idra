import { typedInvokeUnwrap } from '../shared/ipc_types';
import { EmailChannels } from '../shared/ipc_channels_definitions';
import type { EmailApi } from '../shared/api_types';
import type { EmailProviderId, EmailProviderInput, EmailSettings } from '../shared/email_types';

export const email: EmailApi = {
	getSettings: (): Promise<EmailSettings> => typedInvokeUnwrap(EmailChannels.getSettings),
	saveProvider: (providerId: EmailProviderId, input: EmailProviderInput): Promise<EmailSettings> =>
		typedInvokeUnwrap(EmailChannels.saveProvider, providerId, input),
};
