import type { DiagramState } from './types';

export const defaultSource = `---
title: Friday architecture
---
flowchart LR
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
  "deterministicIDSeed": "friday-diagrams",
  "flowchart": {
    "htmlLabels": true,
    "curve": "basis"
  }
}`;

export const defaultState: DiagramState = {
	source: defaultSource,
	configText: defaultConfigText,
	theme: 'auto',
	look: 'classic',
	layout: 'dagre',
	live: true,
	view: 'split',
};
