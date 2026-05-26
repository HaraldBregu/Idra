export interface SkillFrontmatter {
	name: string;
	description: string;
	license?: string;
	compatibility?: string;
	metadata?: Record<string, unknown>;
	allowedTools?: string[];
}

export interface SkillInfo {
	id: string;
	name: string;
	description: string;
	location: string;
}

export interface SkillSupportFile {
	relativePath: string;
	kind: 'script' | 'reference' | 'asset' | 'file';
	size: number;
}

export interface SkillDetails extends SkillInfo {
	frontmatter: SkillFrontmatter;
	instructions: string;
	supportFiles: SkillSupportFile[];
}

export interface SkillValidationIssue {
	code: string;
	message: string;
}

export type SkillValidationResult =
	| {
			valid: true;
			issues: [];
			skill: {
				info: SkillInfo;
				frontmatter: SkillFrontmatter;
				instructions?: string;
			};
	  }
	| {
			valid: false;
			issues: SkillValidationIssue[];
	  };

export interface SkillImportSkipped {
	name: string;
	sourcePath: string;
	reason: string;
}

export interface SkillImportResult {
	imported: SkillInfo[];
	skipped: SkillImportSkipped[];
}

export interface SkillDownloadResult {
	id: string;
	name: string;
	destinationPath: string;
}

export interface SkillDeleteResult {
	id: string;
	name: string;
	deleted: boolean;
}
