export const EMPTY_MERMAID_CONTENT = `flowchart TD
    A[Start] --> B[End]
`;

export const EMPTY_EXCALIDRAW_CONTENT = JSON.stringify(
	{
		type: 'excalidraw',
		version: 2,
		source: 'https://excalidraw.com',
		elements: [],
		appState: {
			gridSize: null,
			viewBackgroundColor: '#ffffff',
		},
		files: {},
	},
	null,
	2
);
