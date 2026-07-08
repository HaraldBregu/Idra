import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Extension, type Editor, type Range } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import {
	Suggestion,
	exitSuggestion,
	type SuggestionKeyDownProps,
	type SuggestionProps,
} from '@tiptap/suggestion';
import { Sparkles, Target, Zap, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const slashMenuPluginKey = new PluginKey('slashMenu');

type SlashMenuItem = {
	readonly title: string;
	readonly icon: LucideIcon;
	readonly run: (props: { editor: Editor; range: Range }) => void;
};

// ponytail: eager one-shot load; refreshed on the next keystroke if it lands late.
let skillNames: readonly string[] = [];
void window.agent
	?.skillsList()
	.then((list) => {
		skillNames = list.map((skill) => skill.name);
	})
	.catch(() => {});

const insert = (text: string) => ({ editor, range }: { editor: Editor; range: Range }) =>
	editor.chain().focus().insertContentAt(range, text).run();

const categoryItems: readonly SlashMenuItem[] = [
	{
		title: 'Skills',
		icon: Sparkles,
		run: insert('/skill '),
	},
	{
		title: 'Goal',
		icon: Target,
		run: insert('/goal '),
	},
];

function skillItems(): SlashMenuItem[] {
	return skillNames.map((name) => ({
		title: name,
		description: 'Skill',
		icon: Zap,
		run: insert(`/skill ${name} `),
	}));
}

// Text after the '/' up to the cursor, without a trailing category token.
const isSkillPhase = (query: string): boolean => /^skill\s/i.test(query);

function itemsForQuery(query: string): SlashMenuItem[] {
	const q = query.toLowerCase();
	if (isSkillPhase(q)) {
		const rest = q.replace(/^skill\s+/, '');
		return skillItems().filter((item) => item.title.toLowerCase().includes(rest));
	}
	return categoryItems.filter((item) => item.title.toLowerCase().includes(q));
}

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
				allowSpaces: true,
				placement: 'top-start',
				// Show while picking a category (single token) or a skill (skill + partial
				// name). Any completed command ("/skill demo ", "/goal ") closes the menu.
				allow: ({ state, range }) => {
					const text = state.doc.textBetween(range.from, range.to);
					const query = text.startsWith('/') ? text.slice(1) : text;
					return /^\S*$/.test(query) || /^skill\s+\S*$/i.test(query);
				},
				items: ({ query }) => itemsForQuery(query),
				command: ({ editor, range, props }) => props.run({ editor, range }),
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
								exitSuggestion(props.view, slashMenuPluginKey);
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
