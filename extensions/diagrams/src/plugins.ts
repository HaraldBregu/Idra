import { icons as logos } from '@iconify-json/logos';
import { icons as mdi } from '@iconify-json/mdi';
import elkLayouts from '@mermaid-js/layout-elk';
import tidyTreeLayouts from '@mermaid-js/layout-tidy-tree';
import zenuml from '@mermaid-js/mermaid-zenuml';
import mermaid from 'mermaid';

mermaid.registerLayoutLoaders(elkLayouts);
mermaid.registerLayoutLoaders(tidyTreeLayouts);
mermaid.registerIconPacks([
	{ name: logos.prefix, icons: logos },
	{ name: mdi.prefix, icons: mdi },
]);

export const pluginsReady = mermaid.registerExternalDiagrams([zenuml]);
