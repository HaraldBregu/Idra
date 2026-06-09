export const SkillsChannels = {
	list: 'skills:list',
	load: 'skills:load',
	import: 'skills:import',
	download: 'skills:download',
	delete: 'skills:delete',
	getRoot: 'skills:get-root',
} as const;

export interface SkillsInvokeChannelMap {
	[SkillsChannels.list]: { args: []; result: import('../../skills').SkillInfo[] };
	[SkillsChannels.load]: { args: [name: string]; result: import('../../skills').SkillDetails };
	[SkillsChannels.import]: { args: []; result: import('../../skills').SkillImportResult | undefined };
	[SkillsChannels.download]: {
		args: [name: string];
		result: import('../../skills').SkillDownloadResult | undefined;
	};
	[SkillsChannels.delete]: { args: [name: string]; result: import('../../skills').SkillDeleteResult };
	[SkillsChannels.getRoot]: { args: []; result: string };
}
