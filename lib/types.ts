export type Theme = 'dark' | 'light' | 'orange';
export type ActId = 'act-0' | 'act-1' | 'act-2' | 'act-3' | 'act-4' | 'act-5' | 'act-6' | 'act-7' | 'act-8';
export type SceneKind = 'title' | 'editorial' | 'diagram' | 'data' | 'timeline' | 'challenge' | 'demo' | 'meme' | 'network' | 'cta';
export type DemoComponentName = 'CampusBotDemo' | 'RagDemo' | 'SocDemo';
export type SceneComponentName =
  | 'TitleScene' | 'ContentScene' | 'TimelineScene' | 'MemeScene' | 'NetworkScene' | 'FinalScene'
  | DemoComponentName
  | 'RolePathScene' | 'RagFlowScene' | 'AgentLoopScene' | 'SupplyChainScene' | 'AiWritesBugScene'
  | 'AiFixesBugScene' | 'ProblemProductScene' | 'GovernanceCurveScene' | 'ProgrammeScene';

type SceneBase = {
  id: `scene-${string}`;          // 'scene-01' … 'scene-46'
  slide: number;                  // 1 … 46; equals array index + 1
  act: ActId;                     // 'act-0' only on slide 1
  theme: Theme;                   // Appendix A
  accent?: 'orange';              // dark-theme eyebrow colour (A8); omitted = green
  eyebrow?: string;
  title?: string;
  sourceNotes?: string[];         // §3.1 rule 4
  pin: boolean;
  scrollLength: number;           // viewport heights: 1 when pin is false, ≥ 2 when true
  component?: SceneComponentName; // set only where Appendix A marks the component with *
};

export type Step = { n: string; term?: string; text: string };
export type Mark = { at: string; text: string };
export type Metric = { value: string; label?: string; heading?: string; versus?: [string, string] };

export type Block =
  | { type: 'lines'; lines: string[] }
  | { type: 'steps'; items: Step[] }
  | { type: 'terms'; items: { letter?: string; term: string; text: string; note?: string }[] }
  | { type: 'layers'; items: { term?: string; text: string; aside?: string }[]; footer?: string; marker?: string }
  | { type: 'marks'; items: Mark[] }
  | { type: 'metrics'; items: Metric[] }
  | { type: 'flow'; label?: string; items: string[]; marker?: string }
  | { type: 'columns'; items: { heading: string; lines: string[] }[] }
  | { type: 'bars'; series: string[]; note?: string; ratios?: number[] };

export type BlocksContent = { blocks: Block[] };
export type TitleContent = { words: string[]; speaker: string; role: string };
export type DemoContent = { subtitle: string };
export type MemeContent = { memeId: number; lines: string[] };
export type NetworkContent = { lead: string; timer: string; seconds: number; prompts: Step[] };
export type CtaContent = { lines: string[]; closing: string; speaker: string; role: string; linkedin: string };

export type Scene =
  | (SceneBase & { kind: 'title'; content: TitleContent })
  | (SceneBase & { kind: 'editorial' | 'diagram' | 'data' | 'timeline' | 'challenge'; content: BlocksContent })
  | (SceneBase & { kind: 'demo'; component: DemoComponentName; content: DemoContent })
  | (SceneBase & { kind: 'meme'; content: MemeContent })
  | (SceneBase & { kind: 'network'; content: NetworkContent })
  | (SceneBase & { kind: 'cta'; content: CtaContent });

export type SceneProps = { scene: Scene }; // props of every registry component

export type SceneBeat = { // TRD §5, verbatim
  id: string;
  start: number; // 0..1
  end: number;   // 0..1
  action: 'fade' | 'slide' | 'scale' | 'draw' | 'reveal' | 'counter' | 'state';
};
