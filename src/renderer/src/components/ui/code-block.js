import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
import { useIsDark } from "@/hooks/use-is-dark";
import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";
function CodeBlock({ children, className, ...props }) {
    return (_jsx("div", { className: cn("not-prose flex w-full flex-col overflow-clip border", "border-border bg-card text-card-foreground rounded-xl", className), ...props, children: children }));
}
function CodeBlockCode({ code, language = "tsx", theme, className, ...props }) {
    const isDark = useIsDark();
    const activeTheme = theme ?? (isDark ? "github-dark" : "github-light");
    const [highlightedHtml, setHighlightedHtml] = useState(null);
    useEffect(() => {
        async function highlight() {
            if (!code) {
                setHighlightedHtml("<pre><code></code></pre>");
                return;
            }
            const html = await codeToHtml(code, { lang: language, theme: activeTheme });
            setHighlightedHtml(html);
        }
        highlight();
    }, [activeTheme, code, language]);
    const classNames = cn("w-full overflow-x-auto bg-code text-[13px] text-code-foreground [&>pre]:min-w-full [&>pre]:w-max [&>pre]:!bg-transparent [&>pre]:px-4 [&>pre]:py-4", className);
    // SSR fallback: render plain code if not hydrated yet
    return highlightedHtml ? (_jsx("div", { className: classNames, dangerouslySetInnerHTML: { __html: highlightedHtml }, ...props })) : (_jsx("div", { className: classNames, ...props, children: _jsx("pre", { children: _jsx("code", { children: code }) }) }));
}
function CodeBlockGroup({ children, className, ...props }) {
    return (_jsx("div", { className: cn("flex items-center justify-between", className), ...props, children: children }));
}
export { CodeBlockGroup, CodeBlockCode, CodeBlock };
