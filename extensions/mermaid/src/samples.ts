import type { Example } from './types';

export const examples: Example[] = [
	{
		name: 'Flowchart',
		source: `flowchart LR
    Idea([Idea]) --> Plan{Ready?}
    Plan -- Yes --> Build[Build]
    Plan -- No --> Refine[Refine]
    Refine --> Plan
    Build --> Ship([Ship])`,
	},
	{
		name: 'Sequence',
		source: `sequenceDiagram
    autonumber
    actor User
    participant Friday
    participant Agent
    User->>Friday: Ask for help
    Friday->>Agent: Start task
    Agent-->>Friday: Stream result
    Friday-->>User: Show result`,
	},
	{
		name: 'Class',
		source: `classDiagram
    class Extension {
      +String id
      +open()
    }
    class DiagramEngine {
      +parse(source)
      +render(source)
    }
    Extension *-- DiagramEngine`,
	},
	{
		name: 'State',
		source: `stateDiagram-v2
    [*] --> Editing
    Editing --> Rendering: source changed
    Rendering --> Ready: valid
    Rendering --> Error: invalid
    Error --> Editing
    Ready --> Editing`,
	},
	{
		name: 'Entity relationship',
		source: `erDiagram
    PROJECT ||--o{ DIAGRAM : contains
    DIAGRAM ||--o{ EXPORT : creates
    PROJECT {
      string name
    }
    DIAGRAM {
      string source
      string type
    }`,
	},
	{
		name: 'User journey',
		source: `journey
    title Create a diagram
    section Author
      Choose an example: 5: User
      Edit source: 4: User
    section Review
      Validate syntax: 5: Friday
      Export result: 5: User`,
	},
	{
		name: 'Gantt',
		source: `gantt
    title Extension delivery
    dateFormat YYYY-MM-DD
    section Build
    Integrate Mermaid :done, a1, 2026-08-09, 1d
    Verify diagrams  :active, a2, after a1, 2d
    Package release  :a3, after a2, 1d`,
	},
	{
		name: 'Pie',
		source: `pie showData
    title Diagram usage
    "Flowcharts" : 42
    "Sequence" : 28
    "Architecture" : 18
    "Other" : 12`,
	},
	{
		name: 'Quadrant',
		source: `quadrantChart
    title Value and effort
    x-axis Low effort --> High effort
    y-axis Low value --> High value
    quadrant-1 Strategic
    quadrant-2 Quick wins
    quadrant-3 Reconsider
    quadrant-4 Long bets
    Live preview: [0.25, 0.85]
    Export: [0.45, 0.72]
    Custom renderer: [0.82, 0.44]`,
	},
	{
		name: 'Requirement',
		source: `requirementDiagram
    requirement editor {
	      id: 1
	      text: Render every Mermaid syntax
      risk: medium
      verifymethod: test
    }
    element extension {
      type: software
    }
    extension - satisfies -> editor`,
	},
	{
		name: 'Git graph',
		source: `gitGraph LR:
    commit id: "extension"
    branch mermaid
    checkout mermaid
    commit id: "mermaid"
    commit id: "preview"
    checkout main
    merge mermaid
    commit id: "release"`,
	},
	{
		name: 'C4 context',
		source: `C4Context
    title Friday extension context
    Person(user, "User", "Authors diagrams")
    System(friday, "Friday", "Desktop AI copilot")
    System_Ext(mermaid, "Mermaid", "Diagram renderer")
    Rel(user, friday, "Uses")
    Rel(friday, mermaid, "Renders with")`,
	},
	{
		name: 'Mindmap',
		source: `mindmap
  root((Mermaid))
    Diagrams
      Flowcharts
      Sequence
      Architecture
    Styling
      Themes
      Looks
      Layouts
    Export
      SVG
      PNG
      Print`,
	},
	{
		name: 'Mindmap tidy tree',
		source: `---
config:
  layout: tidy-tree
---
mindmap
  root((Mermaid))
    Author
      Source
      Config
    Preview
      Validate
      Render
    Export
      SVG
      PNG`,
	},
	{
		name: 'Timeline',
		source: `timeline
    title Mermaid extension
    Audit : Extension conventions
    Build : Mermaid integration : Editor UI
    Verify : Syntax coverage : Runtime smoke
    Install : Friday extension`,
	},
	{
		name: 'Sankey',
		source: `sankey-beta
Source,Parser,100
Parser,Renderer,92
Parser,Error,8
Renderer,SVG,70
Renderer,PNG,22`,
	},
	{
		name: 'XY chart',
		source: `xychart-beta
    title "Renders per minute"
    x-axis [1, 2, 3, 4, 5]
    y-axis "Renders" 0 --> 50
    bar [8, 16, 24, 33, 42]
    line [10, 18, 27, 36, 46]`,
	},
	{
		name: 'Block',
		source: `block-beta
    columns 3
    Source space:2 Preview
    space:3
    Config space Export
    Source --> Preview
    Config --> Preview
    Preview --> Export`,
	},
	{
		name: 'Packet',
		source: `packet-beta
    0-3: "Version"
    4-7: "Header length"
    8-15: "Service"
    16-31: "Payload length"`,
	},
	{
		name: 'Kanban',
		source: `kanban
  backlog[Backlog]
    audit[Audit requirements]
  progress[In progress]
    editor[Build editor]
    render[Integrate renderer]
  done[Done]
    scaffold[Create Mermaid extension]`,
	},
	{
		name: 'Architecture',
		source: `architecture-beta
    group app(cloud)[Friday]
    service ui(logos:react)[Editor] in app
    service engine(logos:javascript)[Mermaid] in app
    service files(disk)[Exports]
    ui:R --> L:engine
    engine:R --> L:files`,
	},
	{
		name: 'Radar',
		source: `radar-beta
    title Diagram quality
    axis speed["Speed"], clarity["Clarity"], access["Accessibility"], export["Export"], coverage["Coverage"]
    curve current["Mermaid"] { 85, 92, 88, 90, 96 }
    max 100
    min 0`,
	},
	{
		name: 'Treemap',
		source: `treemap-beta
"Mermaid"
    "Structural": 34
    "Behavioral": 28
    "Planning": 20
    "Charts": 18`,
	},
	{
		name: 'ZenUML',
		source: `zenuml
    title Render a diagram
    User->Editor: Update source
    Editor.Render() {
      Parser.Validate()
      Renderer.CreateSVG()
    }
    Editor->User: Show preview`,
	},
	{
		name: 'Swimlanes',
		source: `swimlane-beta LR
    subgraph User
      request[Describe diagram]
      review[Review preview]
    end
    subgraph Friday
      validate[Validate source]
      render[Render SVG]
    end
    request --> validate --> render --> review`,
	},
	{
		name: 'Event modeling',
		source: `eventmodeling
    tf 01 ui DiagramEditor
    tf 02 cmd RenderDiagram { source: string }
    tf 03 evt DiagramRendered { type: string }
    tf 04 rmo DiagramPreview
    tf 05 ui DiagramEditor`,
	},
	{
		name: 'Venn',
		source: `venn-beta
    title "Diagram qualities"
    set Clear
    set Complete
    set Secure
    union Clear,Complete,Secure["Friday Mermaid"]`,
	},
	{
		name: 'Ishikawa',
		source: `ishikawa-beta
    Unclear Diagram
      Source
        Missing labels
        Invalid syntax
      Layout
        Too many nodes
        Wrong direction
      Styling
        Low contrast
        Small text`,
	},
	{
		name: 'Wardley map',
		source: `wardley-beta
    title Diagram Workbench
    anchor User [0.95, 0.70]
    component Editor [0.78, 0.62]
    component Mermaid [0.58, 0.76]
    component Browser [0.35, 0.90]
    User -> Editor
    Editor -> Mermaid
    Mermaid -> Browser
    evolve Mermaid 0.88`,
	},
	{
		name: 'Cynefin',
		source: `cynefin-beta
    title Diagram decisions
    complex
      "Explore a new notation"
    complicated
      "Tune a dense layout"
    clear
      "Export a valid SVG"
    chaotic
      "Recover a broken render"
    confusion
      "Choose the diagram family"`,
	},
	{
		name: 'Tree view',
		source: `---
config:
  treeView:
    showIcons: true
---
treeView-beta
    mermaid/
        src/
            App.tsx icon(mdi:react)
            engine.ts icon(mdi:cog)
        package.json icon(logos:npm-icon)
        README.md`,
	},
	{
		name: 'Railroad',
		source: `railroad-beta
    title Diagram statement
    statement = sequence(nonterminal("subject"), choice(terminal("-->"), terminal("---")), nonterminal("object"));`,
	},
	{
		name: 'Railroad EBNF',
		source: `railroad-ebnf-beta
    title Expression grammar
    expression = term, { ("+" | "-"), term };
    term = factor, { ("*" | "/"), factor };
    factor = number | "(", expression, ")";`,
	},
	{
		name: 'Railroad ABNF',
		source: `railroad-abnf-beta
    title Identifier grammar
    identifier = ALPHA *(ALPHA / DIGIT / "-");
    ALPHA = %x41-5A / %x61-7A;
    DIGIT = %x30-39;`,
	},
	{
		name: 'Railroad PEG',
		source: `railroad-peg-beta
    title Expression grammar
    expression <- term (("+" / "-") term)*;
    term <- factor (("*" / "/") factor)*;
    factor <- number / "(" expression ")";
	    number <- digit+;
	    digit <- "0" / "1" / "2" / "3" / "4" / "5" / "6" / "7" / "8" / "9";`,
	},
	{
		name: 'Info',
		source: `info`,
	},
	{
		name: 'Math and Markdown',
		source: `flowchart LR
    label["\`**Energy**\`"] --> formula["$$E = mc^2$$"] --> result["\`Mass becomes *energy*\`"]`,
	},
	{
		name: 'Legacy directive',
		source: `%%{init: { "flowchart": { "curve": "linear" } } }%%
flowchart LR
    Compatible --> Configured --> Rendered`,
	},
];
