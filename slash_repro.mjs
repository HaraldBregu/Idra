import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
	url: 'http://localhost/',
	pretendToBeVisual: true,
});
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
for (const key of [
	'Node',
	'Element',
	'HTMLElement',
	'Document',
	'DocumentFragment',
	'DOMParser',
	'MutationObserver',
	'getComputedStyle',
	'requestAnimationFrame',
	'cancelAnimationFrame',
	'ResizeObserver',
	'CustomEvent',
	'KeyboardEvent',
	'MouseEvent',
	'InputEvent',
	'Range',
]) {
	if (dom.window[key] !== undefined && global[key] === undefined) global[key] = dom.window[key];
}
if (!global.ResizeObserver) {
	global.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
	dom.window.ResizeObserver = global.ResizeObserver;
}

const { Editor, Extension } = await import('@tiptap/core');
const { PluginKey } = await import('@tiptap/pm/state');
const { Suggestion } = await import('@tiptap/suggestion');
const { default: StarterKit } = await import('@tiptap/starter-kit');
const { Markdown } = await import('@tiptap/markdown');
const { Placeholder } = await import('@tiptap/extensions');

const slashMenuPluginKey = new PluginKey('slashMenu');

const skillNames = ['demo', 'python-console-examples', 'skill_generator'];

const insert = (text) => ({ editor, range }) =>
	editor.chain().focus().insertContentAt(range, text).run();

const categoryItems = [
	{ title: 'Skills', run: insert('/skill ') },
	{ title: 'Goal', run: insert('/goal ') },
];

function skillItems() {
	return skillNames.map((name) => ({ title: name, run: insert(`/skill ${name} `) }));
}

const isSkillPhase = (query) => /^skill\s/i.test(query);

function itemsForQuery(query) {
	const q = query.toLowerCase();
	if (isSkillPhase(q)) {
		const rest = q.replace(/^skill\s+/, '');
		return skillItems().filter((item) => item.title.toLowerCase().includes(rest));
	}
	return categoryItems.filter((item) => item.title.toLowerCase().includes(q));
}

const events = [];
let lastProps = null;

const SlashMenu = Extension.create({
	name: 'slashMenu',
	addProseMirrorPlugins() {
		return [
			Suggestion({
				editor: this.editor,
				pluginKey: slashMenuPluginKey,
				char: '/',
				allowSpaces: true,
				placement: 'top-start',
				allow: ({ state, range }) => {
					if (range.from !== 1) return false;
					const text = state.doc.textBetween(range.from, range.to);
					const query = text.startsWith('/') ? text.slice(1) : text;
					return /^\S*$/.test(query) || /^skill\s+\S*$/i.test(query);
				},
				items: ({ query }) => itemsForQuery(query),
				command: ({ editor, range, props }) => props.run({ editor, range }),
				render: () => ({
					onStart: (props) => {
						lastProps = props;
						events.push({ ev: 'start', query: props.query, items: props.items.map((i) => i.title), loading: props.loading });
					},
					onUpdate: (props) => {
						lastProps = props;
						events.push({ ev: 'update', query: props.query, items: props.items.map((i) => i.title), loading: props.loading });
					},
					onExit: () => {
						events.push({ ev: 'exit' });
					},
				}),
			}),
		];
	},
});

const el = document.getElementById('app');
const editor = new Editor({
	element: el,
	extensions: [StarterKit, Placeholder.configure({ placeholder: 'x' }), Markdown, SlashMenu],
	content: '',
	contentType: 'markdown',
});

const wait = () => new Promise((resolve) => setTimeout(resolve, 30));

function type(text) {
	for (const ch of text) {
		const { state } = editor.view;
		editor.view.dispatch(state.tr.insertText(ch, state.selection.from, state.selection.to));
	}
}

function report(label) {
	const pluginState = slashMenuPluginKey.getState(editor.state);
	console.log(`--- ${label}`);
	console.log('doc text:', JSON.stringify(editor.state.doc.textContent));
	console.log('markdown:', JSON.stringify(editor.getMarkdown()));
	console.log('plugin:', JSON.stringify({ active: pluginState.active, query: pluginState.query, range: pluginState.range, dismissed: pluginState.dismissedRange }));
	console.log('events:', JSON.stringify(events));
	events.length = 0;
}

editor.commands.focus('end');
type('/');
await wait();
report('after typing "/"');

if (!lastProps) {
	console.log('NO MENU PROPS — menu never opened');
	process.exit(1);
}

const skillsItem = lastProps.items.find((i) => i.title === 'Skills');
lastProps.command(skillsItem);
await wait();
report('after selecting "Skills" category');

// simulate the TextEditor value-sync effect: parent stores getMarkdown(), effect
// resets content only when it differs
const value = editor.getMarkdown();
if (editor.getMarkdown() !== value) {
	editor.chain().setContent(value, { emitUpdate: false, contentType: 'markdown' }).focus('end').run();
}
await wait();
report('after value-sync effect');

if (lastProps) {
	const pick = lastProps.items[0];
	if (pick) {
		lastProps.command(pick);
		await wait();
		report(`after selecting skill "${pick.title}"`);
	} else {
		console.log('NO ITEMS to select in skill phase');
	}
}

process.exit(0);
