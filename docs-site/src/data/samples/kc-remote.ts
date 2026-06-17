// Sample data for <kc-remote> non-scalar props. One file per element;
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob, so
// adding an element never touches a shared file.
//
// `sample`  = default non-scalar prop data (the playground + bare examples use it)
// `named`   = alternate sets a focused <Example data="…"> can opt into
//
// kc-remote has two non-scalar props:
//   `envelope` — the CardEnvelope to deliver into the sandboxed iframe
//   `policy`   — optional CardPolicy for routing events (left out of samples;
//                the kc-card bubbling event is sufficient for docs purposes)
//
// The FORM_ENVELOPE is used as the playground default: it is the richest
// interactive card and best illustrates the full round-trip.
// The WEATHER_ENVELOPE is used for auto-height and self-contained display
// named sets (the forecast <details> toggle grows the iframe height).

const FORM_ENVELOPE = {
  type: 'form',
  id: 'remote-form-1',
  title: 'Quick question',
  data: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', title: 'Email', format: 'email' },
      role: { type: 'string', title: 'Role', enum: ['Engineer', 'Designer', 'PM'] },
    },
    'x-kc-submitLabel': 'Send',
  },
};

const WEATHER_ENVELOPE = {
  type: 'info',
  id: 'remote-info-1',
  title: 'San Francisco',
  data: {
    location: 'San Francisco',
    temperature: 18,
    unit: '°C',
    condition: 'Partly cloudy',
    humidity: 64,
    wind: 12,
    feelsLike: 17,
    forecast: [
      { day: 'Mon', high: 19, low: 12 },
      { day: 'Tue', high: 21, low: 13 },
      { day: 'Wed', high: 17, low: 11 },
    ],
  },
};

export default {
  // Default: form card — shows the interactive happy-path pattern.
  sample: {
    envelope: FORM_ENVELOPE,
  },
  named: {
    // Form card with envelope visible — used by the "Remote form" example.
    form: {
      envelope: FORM_ENVELOPE,
    },
    // Self-contained display card — used by the auto-height + theme-push examples.
    weather: {
      envelope: WEATHER_ENVELOPE,
    },
  },
};
