import type { PolicyConfig, PolicyDecision, Permission } from '../../shared/policy';
import { evaluate } from './evaluate';

export interface PolicyStorePort {
	getPolicy(): PolicyConfig;
}

export class PolicyService {
	constructor(private readonly store: PolicyStorePort) {}

	evaluate(targetPath: string, permission: Permission): PolicyDecision {
		return evaluate(this.store.getPolicy(), targetPath, permission);
	}
}
