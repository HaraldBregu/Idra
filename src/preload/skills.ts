import { typedInvokeUnwrap } from '../shared/ipc_types';
import { SkillsChannels } from '../shared/ipc_channels_definitions';
import type { SkillsApi } from './index.d';

export const skills: SkillsApi = {
	list: () => {
		return typedInvokeUnwrap(SkillsChannels.list);
	},
	load: (name: string) => {
		return typedInvokeUnwrap(SkillsChannels.load, name);
	},
	import: () => {
		return typedInvokeUnwrap(SkillsChannels.import);
	},
	download: (name: string) => {
		return typedInvokeUnwrap(SkillsChannels.download, name);
	},
	delete: (name: string) => {
		return typedInvokeUnwrap(SkillsChannels.delete, name);
	},
	openRoot: () => {
		return typedInvokeUnwrap(SkillsChannels.openRoot);
	},
	getRoot: () => {
		return typedInvokeUnwrap(SkillsChannels.getRoot);
	},
};
