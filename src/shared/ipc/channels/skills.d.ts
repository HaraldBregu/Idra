export declare const SkillsChannels: {
    readonly list: "skills:list";
    readonly load: "skills:load";
    readonly import: "skills:import";
    readonly download: "skills:download";
    readonly delete: "skills:delete";
    readonly getRoot: "skills:get-root";
};
export interface SkillsInvokeChannelMap {
    [SkillsChannels.list]: {
        args: [];
        result: import('../../skills/types').SkillInfo[];
    };
    [SkillsChannels.load]: {
        args: [name: string];
        result: import('../../skills/types').SkillDetails;
    };
    [SkillsChannels.import]: {
        args: [];
        result: import('../../skills/types').SkillImportResult | undefined;
    };
    [SkillsChannels.download]: {
        args: [name: string];
        result: import('../../skills/types').SkillDownloadResult | undefined;
    };
    [SkillsChannels.delete]: {
        args: [name: string];
        result: import('../../skills/types').SkillDeleteResult;
    };
    [SkillsChannels.getRoot]: {
        args: [];
        result: string;
    };
}
