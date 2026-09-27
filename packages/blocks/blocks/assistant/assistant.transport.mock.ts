// THE MOCK DATA MODE (spec 4, "three modes, one axis"): the scripted transport
// an install without flags gets - no endpoint, no key, no provider. `create-kai
// add` writes THIS file's content (and its stripped twin) at
// `assistant.transport.ts`, the one name the controller imports, so mock mode is
// the demo it has always been and the two mock-free modes never ship this file.
//
// LEAF MODULE, DELIBERATELY: no relative imports. The CDN paste form inlines the
// entry, the controller and this file, and refuses anything deeper by name
// (src/registry.ts, inlineRelativeModule). A mock that imported a shared data
// module would make the paste form refuse to generate.
import { createMockResponder, type MockResponder, type MockTurn } from '@kitn.ai/ui/state';
import type { ChatMessage } from '@kitn.ai/ui/state';
import type { StreamSource } from '@kitn.ai/ui/wire';
import type { AssistantTransport } from './assistant.controller';

/** One scripted turn per step of a guide. Every conversation below is the
 *  reviewed storyboard's, reproduced rather than rewritten: the prose is
 *  approved content, and where a fence is a fragment its surrounding sentence
 *  says so, which is what the fence gate keys off. */
type Script = readonly MockTurn[];

/** The four guides, each keyed by the question that opens it.
 *
 *  WHY THE OPENING IS HERE AS WELL AS IN THE CONTROLLER. The empty state's cards
 *  seed their opening exchange directly so a click shows an answer immediately.
 *  A reader who TYPES the same question instead gets it from turn 1 of this
 *  script, so the two paths must agree - and the guard test beside this block
 *  compares them rather than trusting that they do. The controller's copy is the
 *  seed; this one is what the transport answers with. */
const GUIDE_SCRIPTS: Record<string, Script> = {
  'how do i get this talking to my own backend?': [
    {
      text:
        'One file decides where replies come from: `assistant.transport.ts`. The ' +
        'controller imports that name and nothing else, the three modes ship as three ' +
        'versions of it, and the contract that type must satisfy is two methods, not a ' +
        'file you add:\n\n' +
        '```ts\n' +
        "import type { ChatMessage } from '@kitn.ai/ui/state';\n" +
        "import type { StreamSource } from '@kitn.ai/ui/wire';\n" +
        '\n' +
        'export interface AssistantTransport {\n' +
        '  reply(messages: ChatMessage[]): Promise<StreamSource> | StreamSource;\n' +
        '  toolOutput(toolType: string): Record<string, unknown> | undefined;\n' +
        '}\n' +
        '```',
    },
    {
      text:
        'Yours fetches your route and returns the response. The browser never holds a ' +
        'credential — the route does.\n\n' +
        '```ts\n' +
        "import { toOpenAIMessages, type StreamSource } from '@kitn.ai/ui/wire';\n" +
        "import type { AssistantTransport } from './assistant.controller';\n" +
        '\n' +
        'export const transport: AssistantTransport = {\n' +
        '  async reply(messages): Promise<StreamSource> {\n' +
        "    return fetch('/api/chat', {\n" +
        "      method: 'POST',\n" +
        "      headers: { 'Content-Type': 'application/json' },\n" +
        '      body: JSON.stringify({ messages: toOpenAIMessages(messages) }),\n' +
        '    });\n' +
        '  },\n' +
        '  // `undefined` leaves a tool call announced for your route to answer on the next request.\n' +
        '  toolOutput() {\n' +
        '    return undefined;\n' +
        '  },\n' +
        '};\n' +
        '```',
    },
    {
      text:
        'The controller feeds whatever `reply` returns to the kit’s reader, which folds it ' +
        'into the thread. These are its two lines; `stream` is the assistant stream built ' +
        'just above them.\n\n' +
        '```ts\n' +
        'const stream = createAssistantStream((update) => setMessages(update(messages)));\n' +
        'await readOpenAIStream(await transport.reply(messages), stream);\n' +
        '```\n\n' +
        'Swap `readAnthropicStream` if your route speaks Anthropic — nothing else changes. ' +
        'Install with `--no-mock` instead and you get the third version, where `reply` ' +
        'throws with the file you have to write named in the message: an unwired block ' +
        'fails where it would have answered rather than rendering an empty reply.',
    },
  ],
  'which provider does this use? i want to point it at openrouter.': [
    {
      text:
        'None, and that is deliberate: the kit parses provider streams and never calls ' +
        'one. Your route holds the key, sends it a thread, and streams back what the ' +
        'provider says. The four functions you need come from one entry:\n\n' +
        '```ts\n' +
        'import {\n' +
        '  readOpenAIStream, readAnthropicStream,\n' +
        '  toOpenAIMessages, toAnthropicMessages,\n' +
        "} from '@kitn.ai/ui/wire';\n" +
        '```',
    },
    {
      text:
        'OpenRouter speaks the OpenAI wire, so it is the same encode-read pair end to ' +
        'end. `toOpenAIMessages` keeps tool calls and their results on the way back, ' +
        'which is what makes a second round possible.\n\n' +
        '```ts\n' +
        "import { toOpenAIMessages } from '@kitn.ai/ui/wire';\n" +
        '\n' +
        'export async function POST(request: Request) {\n' +
        '  const { messages } = await request.json();\n' +
        "  return fetch('https://openrouter.ai/api/v1/chat/completions', {\n" +
        "    method: 'POST',\n" +
        '    headers: {\n' +
        '      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,\n' +
        "      'Content-Type': 'application/json',\n" +
        '    },\n' +
        "    body: JSON.stringify({ model: 'anthropic/claude-sonnet-4.5', messages: toOpenAIMessages(messages) }),\n" +
        '  });\n' +
        '}\n' +
        '```',
    },
    {
      text:
        'Two things: the key header, and the system prompt, which is a top-level field ' +
        'rather than a message. These are the two differing lines of that route; the ' +
        'surrounding fetch is identical to the one above.\n\n' +
        '```ts\n' +
        "headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },\n" +
        "body: JSON.stringify({ model: 'claude-sonnet-4-5', system, messages: toAnthropicMessages(messages) }),\n" +
        '```',
    },
    {
      text:
        'One gotcha: the ids the switcher lists are the mock’s. Replace them with real ' +
        'ones from your provider before you point this at a gateway, or the provider ' +
        'rejects the request.',
    },
  ],
  'can users talk to this instead of typing?': [
    {
      text:
        '`<kai-voice-input>` records and transcribes. Dropped on a page it uses the ' +
        "browser's own speech recognition, which Chrome and Safari have and Firefox " +
        'does not:\n\n' +
        '```html\n' +
        '<kai-voice-input recognition-lang="en-US" interim></kai-voice-input>\n' +
        '```',
    },
    {
      text:
        'Point `transcribe` at your own service and every browser takes the same route. ' +
        'It gets the recorded audio and returns the text:\n\n' +
        '```ts\n' +
        "const voice = document.querySelector('kai-voice-input');\n" +
        "if (!voice) throw new Error('kai-voice-input is not on the page');\n" +
        '\n' +
        'voice.transcribe = async (audio) => {\n' +
        '  const body = new FormData();\n' +
        "  body.append('file', audio, 'speech.webm');\n" +
        "  const response = await fetch('/api/transcribe', { method: 'POST', body });\n" +
        '  return (await response.json()).text;\n' +
        '};\n' +
        '```',
    },
    {
      text:
        'They do not bubble, so listen on the element:\n\n' +
        '```ts\n' +
        "voice.addEventListener('kai-recording-change', (e) => setRecording(e.detail.recording));\n" +
        "voice.addEventListener('kai-transcript-interim', (e) => showPartial(e.detail.text));\n" +
        "voice.addEventListener('kai-transcription', (e) => insert(e.detail.text));\n" +
        "voice.addEventListener('kai-audio-captured', (e) => keep(e.detail.blob));\n" +
        "voice.addEventListener('kai-voice-error', (e) => report(e.detail.message));\n" +
        '```\n\n' +
        '`start()` and `stop()` on the element do the same thing a click does, which is ' +
        'what a push-to-talk key needs.',
    },
  ],
  'can the model send a form instead of another paragraph?': [
    {
      text:
        'Name a tool with the `kai_` prefix and the call renders as a card: ' +
        '`kai_confirm` renders the confirm card, `kai_tasks` the task list. The part ' +
        "after the prefix is the card type, and the call's arguments ARE the card's " +
        'data - nothing is renamed or defaulted.',
    },
    {
      text:
        'One registry, threaded to both ends: the route advertises the tools, the client ' +
        'says which card types it can render.\n\n' +
        '```ts\n' +
        "import { cardTools, createCardRegistry } from '@kitn.ai/ui/schemas';\n" +
        '\n' +
        "const cards = createCardRegistry({ use: ['confirm', 'tasks'] });\n" +
        'const tools = cardTools(cards); // the route hands these to the model\n' +
        'chat.cardTypes = cards.tags;    // the client renders these tags\n' +
        '```',
    },
    {
      text:
        'A card tool renders and stops; anything else runs. Passing the provider’s ' +
        '`tool_call_id` through as the envelope’s `id` is what makes a revised card ' +
        'replace itself instead of stacking a second copy.\n\n' +
        '```ts\n' +
        "import { applyToolOutput } from '@kitn.ai/ui/wire';\n" +
        "import { cardFromToolCall } from '@kitn.ai/ui/schemas';\n" +
        '\n' +
        '// `runTool` is your own dispatch; `stream` is the assistant stream you are folding into.\n' +
        'for (const call of pendingCalls) {\n' +
        '  const card = cardFromToolCall(call.name, call.input ?? {}, { id: call.id });\n' +
        '  if (card) {\n' +
        '    stream.addCard(card);\n' +
        "    applyToolOutput(stream, call.id, { status: 'awaiting_user' });\n" +
        '    continue;\n' +
        '  }\n' +
        '  applyToolOutput(stream, call.id, await runTool(call.name, call.input ?? {}));\n' +
        '}\n' +
        '```',
    },
    {
      text:
        'A `url_citation` annotation on the stream becomes a `source` part on the ' +
        'message, and the thread renders it under the text. You do not handle those ' +
        'separately.',
    },
  ],
};

/** The generic script every OTHER conversation falls back to: one rich turn set
 *  (reasoning, a settled tool call, citations) so the block demos what the
 *  components render rather than two plain text bubbles. The suggestion arcs are
 *  their own task; until they land, a label plays this. Edit it freely - it is
 *  data, not wiring. */
export const MOCK_SCRIPT = [
  {
    reasoning:
      'Summarizing means reading first. Fetch the document, then compress - numbers before narrative.',
    text: 'Reading q3-metrics.pdf now.',
    toolCalls: [{ name: 'read_document', arguments: { name: 'q3-metrics.pdf' } }],
  },
  {
    reasoning:
      'The numbers agree across sections. Cite where each claim comes from so the strip below is real.',
    text:
      'Summary: revenue up 12% QoQ, retention flat, both launches on schedule. ' +
      "(I'm a local mock - no provider was contacted - but these citations render through the exact path a real model's take.)",
    sources: [
      {
        url: 'https://ui.kitn.ai/guides/state-and-hooks/',
        title: 'State and hooks - AI/UI docs',
        snippet: 'A message is an ordered list of parts: text, reasoning, tool, card, source, file.',
      },
      {
        url: 'https://ui.kitn.ai/guides/recipes/wire-adapter/',
        title: 'The wire adapter - AI/UI docs',
      },
    ],
  },
  {
    reasoning:
      'A destructive step comes next, so ask for it rather than taking it.',
    text: 'Before that goes to the channel:',
    toolCalls: [
      {
        // A CARD TOOL. `kai_` is the kit's prefix for one, and the call's
        // ARGUMENTS ARE THE CARD'S DATA - the controller hands this to
        // `cardFromToolCall`, which builds the envelope. The name is the card
        // type, so `kai_confirm` renders the confirm card and a hand-written
        // envelope is never needed (or wanted: it would demo a shape the app
        // never takes).
        name: 'kai_confirm',
        arguments: {
          heading: 'Post the summary to #team?',
          body: '#team sees the numbers above, with the deck attached. One post.',
          actions: [
            { id: 'post', label: 'Post it', default: true },
            { id: 'edit', label: 'Let me edit first' },
          ],
        },
      },
    ],
  },
];

/** Settled outputs the mock hands back, keyed by tool type. Annotated rather
 *  than inferred: the controller looks one up by the type the stream reports,
 *  which is a string, and an inferred object literal has no index signature to
 *  read it with. */
export const MOCK_TOOL_OUTPUTS: Record<string, Record<string, unknown>> = {
  read_document: { pages: 14, headline: 'Revenue up 12% QoQ; retention flat.' },
};

// Six characters per frame rather than one. The kit's default stages a turn a
// character at a time, which is right for a two-line reply and wrong for content
// this long: a guide's answer carries several hundred characters and a code
// fence, so at one character per frame a reader waits fifteen seconds for it and
// the driver would have to. Framing is unchanged - the same announce fragment,
// the same argument JSON, the same `_kai_mock` tag on every frame.
const STREAM = { chunkSize: 6 } as const;

const respond = createMockResponder({ replies: MOCK_SCRIPT, ...STREAM });

/** Which conversation a thread is: the first thing the reader sent, folded the
 *  way the controller folds it.
 *
 *  A COPY, and it says so. The controller's table of labels keys on exactly this
 *  string, and the transport cannot import that helper: this module is a LEAF
 *  (the paste form inlines it and refuses relative imports), and a real backend
 *  replaces this file wholesale, so it may depend on nothing but the kit. A guard
 *  test beside this block compares the two key sets, which is what keeps two
 *  copies of one rule honest rather than merely equal today. */
const fold = (text: string): string => text.trim().toLowerCase().replace(/\s+/g, ' ');

const openingOf = (messages: readonly ChatMessage[]): string => {
  const first = messages.find((message) => message.role === 'user');
  const part = first?.parts.find((candidate) => candidate.type === 'text');
  return part?.type === 'text' ? fold(part.text) : '';
};

/** How many assistant turns a thread already has: the index of the turn the
 *  reader is waiting for. Read off the MESSAGES rather than kept here, so a
 *  reloaded thread, a restored conversation and a card's seeded opening all
 *  arrive at the same turn the thread is actually on. */
const turnsSoFar = (messages: readonly ChatMessage[]): number =>
  messages.filter((message) => message.role === 'assistant').length;

/** One responder per conversation, and how far its script has run.
 *
 *  `respond()` advances its own counter when it is CALLED, and a returned stream
 *  is lazy - so reaching a turn is a matter of calling it and dropping the
 *  stream, never of iterating one. That is also why the pair is cached: a fresh
 *  responder would number its frames from `kai-mock-1` again, and the message id
 *  the stream carries has to stay unique per turn. */
const progress = new Map<string, { respond: MockResponder; turn: number }>();

const scripted = (key: string, script: Script, wantTurn: number): StreamSource => {
  let state = progress.get(key);
  // A thread asking for an EARLIER turn than this conversation has reached is the
  // same question asked again, which starts at the top rather than resuming.
  if (!state || wantTurn < state.turn) {
    state = { respond: createMockResponder({ replies: script, ...STREAM }), turn: 0 };
  }
  let stream: StreamSource | undefined;
  while (state.turn <= wantTurn) {
    stream = state.respond();
    state.turn += 1;
  }
  progress.set(key, state);
  return stream as StreamSource;
};

export const transport: AssistantTransport = {
  // The thread decides which script answers and which turn of it: the four
  // guides are keyed by their opening question, and anything else plays the
  // generic script above. A real backend reads the messages for a different
  // reason (the conversation IS the request) - the shape of the call is the same.
  reply(messages: ChatMessage[] = []): StreamSource {
    const key = openingOf(messages);
    const script = GUIDE_SCRIPTS[key];
    return script ? scripted(key, script, turnsSoFar(messages)) : respond();
  },
  // The wire only ever ANNOUNCES a tool call - running it and answering is the
  // host's side of the seam. The mock's host is this map: settle the call so its
  // row reaches output-available instead of spinning forever. A real backend's
  // tool loop replaces this, which is why the other two modes answer differently.
  toolOutput(type) {
    return MOCK_TOOL_OUTPUTS[type];
  },
};
