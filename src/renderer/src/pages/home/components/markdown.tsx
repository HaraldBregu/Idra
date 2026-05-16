import type { Components } from 'react-markdown';

export const markdownComponents: Partial<Components> = {
	p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
	ul: ({ children }) => <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>,
	ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>,
	h1: ({ children }) => <h1 className="mb-2 text-2xl font-semibold">{children}</h1>,
	h2: ({ children }) => <h2 className="mb-2 text-xl font-semibold">{children}</h2>,
	h3: ({ children }) => <h3 className="mb-2 text-lg font-semibold">{children}</h3>,
	h4: ({ children }) => <h4 className="mb-2 text-base font-semibold">{children}</h4>,
	h5: ({ children }) => <h5 className="mb-2 text-sm font-semibold">{children}</h5>,
	h6: ({ children }) => <h6 className="mb-2 text-xs font-semibold">{children}</h6>,
};
