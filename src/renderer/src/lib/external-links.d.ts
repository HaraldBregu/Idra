export declare function isExternalHref(href: string | undefined): boolean;
export declare function openExternalUrl(url: string): Promise<void>;
import type { MouseEvent } from 'react';
export declare function handleExternalLinkClick(event: MouseEvent<HTMLAnchorElement>, href?: string): void;
