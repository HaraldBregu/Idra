import path from "node:path";

export interface ConfigOptions {
	location: string;
}

export class Config {
	private readonly _location: string;
	
	constructor(options: ConfigOptions) {
		this._location = path.resolve(options.location);
	}

	get location(): string {
		return this._location;
	}
}
