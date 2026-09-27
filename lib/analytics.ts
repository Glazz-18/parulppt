export type AnalyticsEvent =
  | 'scene_enter'
  | 'scene_complete'
  | 'demo_interaction'
  | 'cta_click'
  | 'source_open';

export function track(event: AnalyticsEvent, payload: Record<string, string | number> = {}): void {
  void event;
  void payload;
}
