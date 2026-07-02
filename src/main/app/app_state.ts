import { Service } from 'typedi';

@Service()
export class AppState {
	private _isQuitting = false;

	get isQuitting(): boolean {
		return this._isQuitting;
	}

	setQuitting(): void {
		this._isQuitting = true;
	}
}
