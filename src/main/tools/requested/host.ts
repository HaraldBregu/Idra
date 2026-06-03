import { textResult } from '../base/tool';

export const hostProvidedTool = async () =>
	textResult('This tool is host-provided and is not executable by Friday locally.', true);
