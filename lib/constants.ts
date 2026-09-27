import { SceneKind, SceneComponentName } from '@/lib/types';

export const ACTS = [
  { id: 'act-1', n: 1, label: 'The World Changed', from: 2, to: 3 },
  { id: 'act-2', n: 2, label: 'Break AI / Live Demos', from: 4, to: 8 },
  { id: 'act-3', n: 3, label: 'Guardrails', from: 9, to: 15 },
  { id: 'act-4', n: 4, label: 'Cyber in the AI Era', from: 16, to: 28 },
  { id: 'act-5', n: 5, label: 'Security → Startup / Compliance / Keep It Simple', from: 29, to: 40 },
  { id: 'act-6', n: 6, label: 'Students as Builders', from: 41, to: 41 },
  { id: 'act-7', n: 7, label: 'Network', from: 42, to: 43 },
  { id: 'act-8', n: 8, label: 'Call to Action', from: 44, to: 46 },
] as const;

export const KIND_COMPONENT: Record<SceneKind, SceneComponentName | null> = {
  title: 'TitleScene',
  editorial: 'ContentScene',
  diagram: 'ContentScene',
  data: 'ContentScene',
  timeline: 'TimelineScene',
  challenge: 'TimelineScene',
  demo: null,
  meme: 'MemeScene',
  network: 'NetworkScene',
  cta: 'FinalScene',
};

export const UI_COPY = {
  nav: 'Scenes',
  source: 'SOURCE',
  close: 'Close',
  previous: 'Previous',
  next: 'Next',
  reset: 'Reset',
  challengeCta: 'Start the 30-day challenge',
  fictional: 'Fictional demonstration',
  start: 'Start',
  pause: 'Pause',
  restart: 'Restart',
  relevance: 'Retrieval relevance',
  authorization: 'Authorization',
  soc: {
    queue: 'Queue',
    investigating: 'Investigating',
    correlated: 'Correlated',
    'pending-approval': 'Pending approval',
    approved: 'Approved',
    rejected: 'Rejected',
  },
} as const;

export const LINKEDIN_HREF = 'https://linkedin.com/in/atharvtiwari'; // provisional, Needs user N1
