// src/primitives/card-validate.ts
// The single shared lean JSON-Schema validator the contract mandates. Covers the
// subset cards use; `x-*` keywords (incl. x-kai-*) are ignored. No ajv. Used at
// every boundary (incoming card data, outgoing payloads) by cards + both transports.

export interface JsonSchema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';
  const?: unknown;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  minimum?: number; maximum?: number;
  exclusiveMinimum?: number; exclusiveMaximum?: number;
  minLength?: number; maxLength?: number;
  pattern?: string;
  minItems?: number; maxItems?: number;
  uniqueItems?: boolean;
  // x-* keywords (e.g. x-kai-widget) are allowed and ignored.
  [key: `x-${string}`]: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function typeOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function matchesType(v: unknown, t: NonNullable<JsonSchema['type']>): boolean {
  switch (t) {
    case 'integer': return typeof v === 'number' && Number.isInteger(v);
    case 'number': return typeof v === 'number' && Number.isFinite(v);
    case 'array': return Array.isArray(v);
    case 'null': return v === null;
    case 'object': return typeOf(v) === 'object';
    default: return typeof v === t;
  }
}

function walk(schema: JsonSchema, value: unknown, path: string, errors: string[]): void {
  const at = path || '(root)';
  if (schema.type && !matchesType(value, schema.type)) {
    errors.push(`${at}: expected ${schema.type}, got ${typeOf(value)}`);
    return; // type wrong → downstream checks are meaningless
  }
  if ('const' in schema && JSON.stringify(value) !== JSON.stringify(schema.const)) {
    errors.push(`${at}: must equal const ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
    errors.push(`${at}: must be one of ${JSON.stringify(schema.enum)}`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${at}: < minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${at}: > maximum ${schema.maximum}`);
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) errors.push(`${at}: <= exclusiveMinimum`);
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) errors.push(`${at}: >= exclusiveMaximum`);
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${at}: shorter than minLength ${schema.minLength}`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${at}: longer than maxLength ${schema.maxLength}`);
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) errors.push(`${at}: does not match pattern`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${at}: fewer than minItems ${schema.minItems}`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${at}: more than maxItems ${schema.maxItems}`);
    if (schema.uniqueItems) {
      const seen = new Set(value.map((v) => JSON.stringify(v)));
      if (seen.size !== value.length) errors.push(`${at}: items not unique`);
    }
    if (schema.items) value.forEach((v, i) => walk(schema.items!, v, `${at}[${i}]`, errors));
  }
  if (typeOf(value) === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in obj) || obj[key] === undefined) errors.push(`${at}.${key}: required`);
    }
    if (schema.properties) {
      for (const [key, sub] of Object.entries(schema.properties)) {
        if (key in obj && obj[key] !== undefined) walk(sub, obj[key], `${at}.${key}`, errors);
      }
    }
  }
}

/** Validate `value` against the lean JSON-Schema subset. */
export function validateAgainstSchema(schema: JsonSchema, value: unknown): ValidationResult {
  const errors: string[] = [];
  walk(schema, value, '', errors);
  return { valid: errors.length === 0, errors };
}
