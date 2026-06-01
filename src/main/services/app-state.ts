/**
 * Centralized, type-safe application state.
 * Replaces the unsafe `(app as { isQuitting?: boolean }).isQuitting` pattern.
 */
export class AppState {
	private _isQuitting = false;

	get isQuitting(): boolean {
		return this._isQuitting;
	}

	setQuitting(): void {
		this._isQuitting = true;
	}
}
