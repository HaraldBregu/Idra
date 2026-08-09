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
      id: REQ-1
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
    branch diagrams
    checkout diagrams
    commit id: "mermaid"
    commit id: "preview"
    checkout main
    merge diagrams
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
		name: 'Timeline',
		source: `timeline
    title Diagrams extension
    Audit : Draw conventions
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
    duplicate[Duplicate Draw]`,
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
    axis speed[Speed], clarity[Clarity], access[Accessibility], export[Export], coverage[Coverage]
    curve current[Diagrams] { 85, 92, 88, 90, 96 }
    max 100
    min 0`,
	},
	{
		name: 'Treemap',
		source: `treemap-beta
"Diagrams"
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
];
