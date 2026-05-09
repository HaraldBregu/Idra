import { Provider } from "./providers";

export interface Service {
	assistant: Assistant;
	rag: string;
	ocr: string;
}

export interface Model {
	id: string;
	name: string;
}

export interface Assistant {
	provider: Provider;
	model: Model;
}
