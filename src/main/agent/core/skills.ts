export interface SkillSummary {
	title: string;
	description: string;
}

export interface LoadedSkill {
	name: string;
	directory: string;
	content: string;
}

export abstract class Skills {
	abstract listSkills(): SkillSummary[];
	abstract loadSkill(name: string): Promise<LoadedSkill | undefined>;
}
