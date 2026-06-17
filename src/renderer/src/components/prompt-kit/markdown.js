'use client';
import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { memo, useId, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { marked } from 'marked';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { CodeBlock, CodeBlockCode } from '@/components/ui/code-block';
import { cn } from '@/lib/utils';
function parseMarkdownIntoBlocks(markdown) {
    const tokens = marked.lexer(markdown);
    return tokens.map((token) => token.raw);
}
function extractLanguage(className) {
    if (!className)
        return 'plaintext';
    const match = className.match(/language-(\w+)/);
    return match ? match[1] : 'plaintext';
}
const initialComponents = {
    code: function CodeComponent({ className, children, ...props }) {
        const isInline = !props.node?.position?.start.line ||
            props.node?.position?.start.line === props.node?.position?.end.line;
        if (isInline) {
            return (_jsx("span", { className: cn('rounded-sm bg-primary-foreground px-1 font-mono text-sm', className), ...props, children: children }));
        }
        const language = extractLanguage(className);
        return (_jsx(CodeBlock, { className: className, children: _jsx(CodeBlockCode, { code: String(children), language: language }) }));
    },
    pre: function PreComponent({ children }) {
        return _jsx(_Fragment, { children: children });
    },
};
const MemoizedMarkdownBlock = memo(function MarkdownBlock({ content, components = initialComponents, }) {
    return (_jsx(ReactMarkdown, { remarkPlugins: [remarkGfm, remarkBreaks], components: components, children: content }));
}, function propsAreEqual(prevProps, nextProps) {
    return prevProps.content === nextProps.content && prevProps.components === nextProps.components;
});
MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock';
function MarkdownComponent({ children, id, className, components = initialComponents, }) {
    const generatedId = useId();
    const blockId = id ?? generatedId;
    const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children]);
    const mergedComponents = useMemo(() => components === initialComponents
        ? initialComponents
        : { ...initialComponents, ...components }, [components]);
    return (_jsx("div", { className: className, children: blocks.map((block, index) => (_jsx(MemoizedMarkdownBlock, { content: block, components: mergedComponents }, `${blockId}-block-${index}`))) }));
}
const Markdown = memo(MarkdownComponent);
Markdown.displayName = 'Markdown';
export { Markdown };
