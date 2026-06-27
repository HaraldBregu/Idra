export const SkillsChannels = {
	list: 'skills:list',
	load: 'skills:load',
	import: 'skills:import',
	download: 'skills:download',
	delete: 'skills:delete',
	setEnabled: 'skills:set-enabled',
	openFolder: 'skills:open-folder',
	getRoot: 'skills:get-root',
} as const;


export interface SkillsInvokeChannelMap {
	[SkillsChannels.list]: { args: []; result: import('../../skills/types').SkillInfo[] };
	[SkillsChannels.load]: { args: [name: string]; result: import('../../skills/types').SkillDetails };
	[SkillsChannels.import]: { args: []; result: import('../../skills/types').SkillImportResult | undefined };
	[SkillsChannels.download]: {
		args: [name: string];
		result: import('../../skills/types').SkillDownloadResult | undefined;
	};
	[SkillsChannels.delete]: { args: [name: string]; result: import('../../skills/types').SkillDeleteResult };
	[SkillsChannels.setEnabled]: {
		args: [id: string, enabled: boolean];
		result: import('../../skills/types').SkillInfo;
	};
	[SkillsChannels.openFolder]: { args: [id: string]; result: void };
	[SkillsChannels.getRoot]: { args: []; result: string };
}
