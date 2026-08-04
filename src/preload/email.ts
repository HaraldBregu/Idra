import { typedInvokeUnwrap } from '../shared/ipc_types';
import { EmailChannels } from '../shared/ipc_channels_definitions';
import type { EmailApi } from '../shared/api_types';
import type { EmailSettings, SmtpSettingsInput } from '../shared/email_types';

export const email: EmailApi = {
	getSettings: (): Promise<EmailSettings> => typedInvokeUnwrap(EmailChannels.getSettings),
	saveSettings: (input: SmtpSettingsInput): Promise<EmailSettings> =>
		typedInvokeUnwrap(EmailChannels.saveSettings, input),
};
