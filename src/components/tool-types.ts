/** A tool-call part rendered by <Tool>. Pure type — kept JSX-free so it can be
 *  imported by the framework-neutral state core and the React typecheck pass. */
export interface ToolPart {
  type: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  toolCallId?: string;
  errorText?: string;
}
