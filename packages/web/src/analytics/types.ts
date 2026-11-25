/** Event-specific values. No names, emails, or device identifiers. */
export type AnalyticsValue = string | number | boolean | null;

/** One local analytics record. Common fields are on every event. */
export interface AnalyticsEvent {
  name: string;
  ts: number;
  session_id: string;
  anon_player_id: string;
  game: '250' | '500' | null;
  mode: string | null;
  difficulty: string | null;
  build: string;
  viewport: string;
  props: Record<string, AnalyticsValue>;
}

/** A destination for events. Sinks must tolerate being skipped. */
export interface Sink {
  write(event: AnalyticsEvent): void;
}

/** Fields copied onto every event from the current table. */
export interface AnalyticsContext {
  game: '250' | '500' | null;
  mode: string | null;
  difficulty: string | null;
}
