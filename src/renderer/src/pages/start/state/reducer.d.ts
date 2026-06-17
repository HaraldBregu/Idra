import type { SetupAction } from './actions';
import type { SetupState } from './types';
export declare const initialSetupState: SetupState;
export declare function setupReducer(state: SetupState, action: SetupAction): SetupState;
