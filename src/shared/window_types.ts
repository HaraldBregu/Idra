export type ContextMenuDescriptor =
	| { type: 'separator' }
	| {
			type?: 'item';
			id: string;
			label: string;
			accelerator?: string;
			enabled?: boolean;
	  };
