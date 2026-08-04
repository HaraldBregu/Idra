import { typedInvokeUnwrap } from '../shared/ipc_types';
import { EmailChannels } from '../shared/ipc_channels_definitions';
import type { EmailApi } from '../shared/api_types';
import type { EmailSettings, SmtpProviderInput } from '../shared/email_types';

export const email: EmailApi = {
	getSettings: (): Promise<EmailSettings> => typedInvokeUnwrap(EmailChannels.getSettings),
	saveProvider: (input: SmtpProviderInput, providerId?: string): Promise<EmailSettings> =>
		typedInvokeUnwrap(EmailChannels.saveProvider, input, providerId),
	selectProvider: (providerId: string): Promise<EmailSettings> =>
		typedInvokeUnwrap(EmailChannels.selectProvider, providerId),
};
