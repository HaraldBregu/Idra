'use client';

import { memo, useId, useMemo } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import { marked } from 'marked';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { CodeBlock, CodeBlockCode } from '@/components/ui/code-block';
import { cn } from '@/lib/utils';

export type MarkdownProps = {
	children: string;
	id?: string;
	className?: string;
	components?: Partial<Components>;
};

function parseMarkdownIntoBlocks(markdown: string): string[] {
	const tokens = marked.lexer(markdown);
	return tokens.map((token) => token.raw);
}

function extractLanguage(className?: string): string {
	if (!className) return 'plaintext';
	const match = className.match(/language-(\w+)/);
	return match ? match[1] : 'plaintext';
}

const initialComponents: Partial<Components> = {
	code: function CodeComponent({ className, children, ...props }) {
		const isInline =
			!props.node?.position?.start.line ||
			props.node?.position?.start.line === props.node?.position?.end.line;

		if (isInline) {
			return (
				<span
					className={cn('rounded-sm bg-primary-foreground px-1 font-mono text-sm', className)}
					{...props}
				>
					{children}
				</span>
			);
		}

		const language = extractLanguage(className);

		return (
			<CodeBlock className={className}>
				<CodeBlockCode code={String(children)} language={language} />
			</CodeBlock>
		);
	},
	pre: function PreComponent({ children }) {
		return <>{children}</>;
	},
};

const MemoizedMarkdownBlock = memo(
	function MarkdownBlock({
		content,
		components = initialComponents,
	}: {
		content: string;
		components?: Partial<Components>;
	}) {
		return (
			<ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
				{content}
			</ReactMarkdown>
		);
	},
	function propsAreEqual(prevProps, nextProps) {
		return prevProps.content === nextProps.content && prevProps.components === nextProps.components;
	}
);

MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock';

function MarkdownComponent({
	children,
	id,
	className,
	components = initialComponents,
}: MarkdownProps) {
	const generatedId = useId();
	const blockId = id ?? generatedId;
	const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children]);
	const mergedComponents = useMemo(
		() =>
			components === initialComponents
				? initialComponents
				: { ...initialComponents, ...components },
		[components]
	);

	return (
		<div className={className}>
			{blocks.map((block, index) => (
				<MemoizedMarkdownBlock
					key={`${blockId}-block-${index}`}
					content={block}
					components={mergedComponents}
				/>
			))}
		</div>
	);
}

const Markdown = memo(MarkdownComponent);
Markdown.displayName = 'Markdown';

export { Markdown };
