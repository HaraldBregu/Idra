import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Extension, type Editor, type Range } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import {
	Suggestion,
	type SuggestionKeyDownProps,
	type SuggestionProps,
} from '@tiptap/suggestion';
import { Code, Heading1, Heading2, List, ListOrdered, TextQuote, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const slashMenuPluginKey = new PluginKey('slashMenu');

type SlashMenuItem = {
	readonly title: string;
	readonly description: string;
	readonly icon: LucideIcon;
	readonly command: (props: { editor: Editor; range: Range }) => void;
};

const slashMenuItems: readonly SlashMenuItem[] = [
	{
		title: 'Heading 1',
		description: 'Large section heading',
		icon: Heading1,
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
	},
	{
		title: 'Heading 2',
		description: 'Medium section heading',
		icon: Heading2,
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
	},
	{
		title: 'Bullet list',
		description: 'Create a simple bullet list',
		icon: List,
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).toggleBulletList().run(),
	},
	{
		title: 'Numbered list',
		description: 'Create a numbered list',
		icon: ListOrdered,
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
	},
	{
		title: 'Quote',
		description: 'Capture a quote',
		icon: TextQuote,
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
	},
	{
		title: 'Code block',
		description: 'Add a code snippet',
		icon: Code,
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
	},
];

type SlashMenuListRef = {
	onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

const SlashMenuList = forwardRef<SlashMenuListRef, SuggestionProps<SlashMenuItem, SlashMenuItem>>(
	function SlashMenuList({ items, command }, ref) {
		const [selectedIndex, setSelectedIndex] = useState(0);

		useEffect(() => setSelectedIndex(0), [items]);

		useImperativeHandle(
			ref,
			() => ({
				onKeyDown: ({ event }) => {
					if (items.length === 0) return false;
					if (event.key === 'ArrowDown') {
						setSelectedIndex((index) => (index + 1) % items.length);
						return true;
					}
					if (event.key === 'ArrowUp') {
						setSelectedIndex((index) => (index + items.length - 1) % items.length);
						return true;
					}
					if (event.key === 'Enter') {
						command(items[selectedIndex]);
						return true;
					}
					return false;
				},
			}),
			[items, selectedIndex, command]
		);

		return (
			<div
				role="listbox"
				aria-label="Slash commands"
				className="z-50 w-64 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
			>
				{items.length === 0 ? (
					<p className="px-2 py-1.5 text-sm text-muted-foreground">No results</p>
				) : (
					items.map((item, index) => (
						<button
							key={item.title}
							type="button"
							role="option"
							aria-selected={index === selectedIndex}
							className={cn(
								'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
								index === selectedIndex && 'bg-accent text-accent-foreground'
							)}
							onMouseEnter={() => setSelectedIndex(index)}
							onClick={() => command(item)}
						>
							<item.icon className="size-4 shrink-0 text-muted-foreground" />
							<span className="flex min-w-0 flex-col">
								<span className="truncate font-medium">{item.title}</span>
								<span className="truncate text-xs text-muted-foreground">{item.description}</span>
							</span>
						</button>
					))
				)}
			</div>
		);
	}
);

export const SlashMenu = Extension.create({
	name: 'slashMenu',

	addProseMirrorPlugins() {
		return [
			Suggestion<SlashMenuItem, SlashMenuItem>({
				editor: this.editor,
				pluginKey: slashMenuPluginKey,
				char: '/',
				placement: 'top-start',
				items: ({ query }) =>
					slashMenuItems.filter((item) =>
						item.title.toLowerCase().includes(query.toLowerCase())
					),
				command: ({ editor, range, props }) => props.command({ editor, range }),
				render: () => {
					let component: ReactRenderer<
						SlashMenuListRef,
						SuggestionProps<SlashMenuItem, SlashMenuItem>
					> | null = null;
					let unmount: (() => void) | null = null;

					return {
						onStart: (props) => {
							component = new ReactRenderer(SlashMenuList, {
								props,
								editor: props.editor,
							});
							unmount = props.mount(component.element as HTMLElement);
						},
						onUpdate: (props) => component?.updateProps(props),
						onKeyDown: (props) => {
							if (props.event.key === 'Escape') {
								unmount?.();
								unmount = null;
								return true;
							}
							return component?.ref?.onKeyDown(props) ?? false;
						},
						onExit: () => {
							unmount?.();
							unmount = null;
							component?.destroy();
							component = null;
						},
					};
				},
			}),
		];
	},
});
