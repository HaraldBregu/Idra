export type ExtensionStoreValue =
	| null
	| boolean
	| number
	| string
	| ExtensionStoreValue[]
	| { [key: string]: ExtensionStoreValue };
