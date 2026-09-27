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
 *  THIS IS THE ONE COPY OF A GUIDE'S OPENING SENTENCE. A card click seeds the
 *  question and then asks the transport for the answer, exactly as a typed
 *  question does, so turn 1 below is what both paths show. The card's own map of
 *  questions is the key set this one has to match, which is what the guard test
 *  beside this block compares. */
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

/** The task list's call id, spelled once because two turns name it: the second
 *  turn REVISES the first turn's call rather than announcing a new one, which is
 *  what makes a card that writes back to its own tool call (see the turn below). */
const TASKS_CALL_ID = 'call_kai-mock-tasklist';

/** The four suggestion arcs, each keyed by the label a reader clicks.
 *
 *  TWO TURNS EACH, AND THAT COUNT IS LOAD-BEARING: the controller indexes its
 *  table of next-step labels by how many answers a thread already has, so a
 *  third turn here would play with no labels offered over it. The arc cannot
 *  branch on what a card asks - the reader's answer is one of the offered labels,
 *  and the next turn plays either way - so a turn that follows a card's question
 *  says which answer it took.
 *
 *  SEPARATE FROM THE GUIDES because the keys are a different vocabulary: a guide
 *  is keyed by the question its card asks, an arc by the one-line label the
 *  reader clicks, which is the thread's first user turn. `reply` reads both. */
const ARC_SCRIPTS: Record<string, Script> = {
  'summarize a document': [
    {
      // The call the answer comes out of, announced before the answer itself:
      // `read_document` is settled by the host's tool output below, so the turn
      // ends with a real result rather than a spinner.
      toolCalls: [{ name: 'read_document', arguments: { name: 'q3-metrics.pdf' } }],
      text:
        'Reading it now.\n\n' +
        '- Revenue up 12%\n' +
        '- Churn flat\n' +
        '- The enterprise tier carrying the quarter',
    },
    {
      // The card IS the turn: permission is the next step, and the confirm card
      // is how it is asked for. The call settles as `awaiting_user` (the
      // controller's card path), so nothing here spins waiting for a click the
      // block cannot receive.
      toolCalls: [
        {
          name: 'kai_confirm',
          arguments: {
            heading: 'Post this summary to #metrics?',
            actions: [
              { id: 'post', label: 'Post', default: true },
              { id: 'edit', label: 'Edit first' },
            ],
          },
        },
      ],
    },
  ],
  'make a task list': [
    {
      text: 'Broke it into four.',
      toolCalls: [
        {
          name: 'kai_tasks',
          id: TASKS_CALL_ID,
          arguments: {
            heading: 'Migration plan',
            tasks: [
              { id: 'inventory', label: 'Inventory the existing tables', description: 'In progress' },
              { id: 'script', label: 'Write the migration script' },
              { id: 'dry-run', label: 'Run it against a copy' },
              { id: 'cutover', label: 'Cut over and verify' },
            ],
          },
        },
      ],
    },
    {
      // The SAME call id, patched: the revision names the call it revises rather
      // than announcing a new one, and the first row is done. The card parts sit
      // in different messages - one per turn - so what the shared id buys is that
      // this IS that card (see `upsertCardPart`, keyed on the envelope id) rather
      // than a second one to anything that keeps cards by id.
      toolCalls: [
        {
          name: 'kai_tasks',
          id: TASKS_CALL_ID,
          arguments: {
            heading: 'Migration plan',
            tasks: [
              { id: 'inventory', label: 'Inventory the existing tables', checked: true },
              { id: 'script', label: 'Write the migration script' },
              { id: 'dry-run', label: 'Run it against a copy' },
              { id: 'cutover', label: 'Cut over and verify' },
            ],
          },
        },
      ],
    },
  ],
  'compare two options': [
    {
      text:
        'Postgres costs you a service and buys concurrency. One server to run, and many writers at once.\n' +
        'SQLite costs you nothing and serializes writes. No service, and one writer at a time.',
      toolCalls: [
        {
          name: 'kai_choice',
          arguments: {
            options: [
              { id: 'postgres', label: 'Postgres' },
              { id: 'sqlite', label: 'SQLite' },
            ],
          },
        },
      ],
    },
    {
      // ONE LINE, AND IT SAYS WHICH PICK IT ASSUMED: the arc cannot branch, so
      // the label offered above ('Use Postgres' or 'Use SQLite') lands here
      // either way and the turn that commits has to name the pick it took.
      text: 'Taking the Postgres pick: concurrency is the part you cannot add later.',
    },
  ],
  'draft a short brief': [
    {
      text: 'Two things I do not have: who this is for, and when.',
      toolCalls: [
        {
          name: 'kai_form',
          // A form card's data IS the JSON Schema of its fields.
          arguments: {
            type: 'object',
            required: ['audience', 'when'],
            properties: {
              audience: { type: 'string', title: 'Who is this for' },
              when: { type: 'string', title: 'When' },
            },
          },
        },
      ],
    },
    {
      // The form above was never answered - a scripted arc cannot wait - so the
      // brief uses the two answers it assumes and names them in its first line.
      text:
        'Assuming the launch team and a Friday send:\n\n' +
        'The launch team gets a new metrics view this Friday. It replaces the sheet the team ' +
        'keeps by hand, so the numbers come from one place. Nothing else changes for readers, ' +
        'and no data moves. If Friday slips, the sheet stays the source of truth until the ' +
        'view is live.',
    },
  ],
};

/** The generic script every OTHER conversation falls back to: one rich turn set
 *  (reasoning, a settled tool call, citations) so the block demos what the
 *  components render rather than two plain text bubbles. A thread that matches
 *  no guide and no arc plays this - a typed prompt, or a conversation carried on
 *  past the end of its script. Edit it freely - it is data, not wiring. */
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
 *  reloaded thread, a restored conversation and a card's asked question all
 *  arrive at the same turn the thread is actually on.
 *
 *  A TURN HAS PARTS, AND THE EMPTY ONE IS NOT A TURN. The host builds its
 *  assistant stream - which appends the message it is about to fill - BEFORE it
 *  calls `reply`, so the thread that arrives here ends with an empty assistant
 *  message for EVERY turn, including the first. Counting it would answer every
 *  question with the NEXT turn's script: the first click would play the second
 *  turn and the labels under it (which the controller indexes by turns that
 *  LANDED) would name a turn nobody had seen. `parts.length` is that distinction,
 *  and it is the only one the message carries: the host's placeholder has none,
 *  and every scripted turn emits at least one. */
const turnsSoFar = (messages: readonly ChatMessage[]): number =>
  messages.filter((message) => message.role === 'assistant' && (message.parts?.length ?? 0) > 0).length;

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
  // The thread decides which script answers and which turn of it: a guide card's
  // question and an arc's label are both the thread's first user turn, so one
  // lookup covers both, and anything else plays the generic script above. A real
  // backend reads the messages for a different reason (the conversation IS the
  // request) - the shape of the call is the same.
  reply(messages: ChatMessage[] = []): StreamSource {
    const key = openingOf(messages);
    const script = GUIDE_SCRIPTS[key] ?? ARC_SCRIPTS[key];
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
