export interface SkillManifest {
	name: string;
	description?: string;
}

export interface SkillInfo {
	id: string;
	folderPath: string;
	manifest: SkillManifest;
}
