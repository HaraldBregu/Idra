import type { DiagramState } from './types';

export const defaultSource = `---
title: Friday architecture
---
flowchart LR
	accTitle: Friday architecture
	accDescr: A user asks Friday for help. Friday's AI agent uses tools, skills, and the workspace to produce a useful result.
    User([User]) --> Friday[Friday]
    Friday --> Agent{AI agent}
    Agent --> Tools[Tools and skills]
    Agent --> Workspace[(Workspace)]
    Tools --> Result[Useful result]
    Workspace --> Result
    Result --> User
`;

export const defaultConfigText = `{
  "fontFamily": "Inter, ui-sans-serif, system-ui, sans-serif",
  "deterministicIds": true,
  "deterministicIDSeed": "friday-mermaid",
  "htmlLabels": true,
  "flowchart": {
    "curve": "basis"
  }
}`;

export const defaultState: DiagramState = {
	source: defaultSource,
	configText: defaultConfigText,
	theme: 'auto',
	look: 'classic',
	layout: 'auto',
	live: true,
	view: 'split',
};
