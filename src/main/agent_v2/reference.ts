import { harnessLayers } from './layers';
import { loopPhases } from './loop';
import { safetyStack } from './safety';
import type { HarnessReference } from './types';

export const harnessReference: HarnessReference = {
	formula: 'Agent = Model + Harness',
	layers: harnessLayers,
	loop: loopPhases,
	safety: safetyStack,
};
