import { jsx as _jsx } from "react/jsx-runtime";
import { handleExternalLinkClick, isExternalHref } from '@/lib/external-links';
export const markdownComponents = {
    p: ({ children }) => _jsx("p", { className: "my-2 first:mt-0 last:mb-0", children: children }),
    ul: ({ children }) => _jsx("ul", { className: "my-2 list-disc space-y-1 pl-5 last:mb-0", children: children }),
    ol: ({ children }) => (_jsx("ol", { className: "my-2 list-decimal space-y-1 pl-5 last:mb-0", children: children })),
    li: ({ children }) => _jsx("li", { className: "pl-1", children: children }),
    a: ({ children, href }) => (_jsx("a", { href: href, target: isExternalHref(href) ? '_blank' : undefined, rel: isExternalHref(href) ? 'noreferrer' : undefined, onClick: (event) => handleExternalLinkClick(event, href), className: "font-medium text-primary underline decoration-border underline-offset-4 hover:text-foreground", children: children })),
    blockquote: ({ children }) => (_jsx("blockquote", { className: "my-3 border-l-2 border-border pl-3 italic text-muted-foreground", children: children })),
    h1: ({ children }) => _jsx("h1", { className: "mb-2 mt-1 text-2xl font-semibold", children: children }),
    h2: ({ children }) => _jsx("h2", { className: "mb-2 mt-1 text-xl font-semibold", children: children }),
    h3: ({ children }) => _jsx("h3", { className: "mb-2 mt-1 text-lg font-semibold", children: children }),
    h4: ({ children }) => _jsx("h4", { className: "mb-2 mt-1 text-base font-semibold", children: children }),
    h5: ({ children }) => _jsx("h5", { className: "mb-2 mt-1 text-sm font-semibold", children: children }),
    h6: ({ children }) => (_jsx("h6", { className: "mb-2 mt-1 text-xs font-semibold uppercase text-muted-foreground", children: children })),
    hr: () => _jsx("hr", { className: "my-4 border-border" }),
    table: ({ children }) => (_jsx("div", { className: "my-3 overflow-x-auto rounded-md border border-border", children: _jsx("table", { className: "w-full border-collapse text-left text-sm", children: children }) })),
    thead: ({ children }) => _jsx("thead", { className: "bg-muted/60", children: children }),
    th: ({ children }) => (_jsx("th", { className: "border-b border-border px-3 py-2 font-semibold", children: children })),
    td: ({ children }) => _jsx("td", { className: "border-t border-border px-3 py-2", children: children }),
};
