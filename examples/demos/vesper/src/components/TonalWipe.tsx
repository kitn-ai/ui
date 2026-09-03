import { createSignal } from 'solid-js';
import './tonal-wipe.css';

interface Props {
  a: string;
  b: string;
  labelA: string;
  labelB: string;
  alt: string;
  caption?: string;
  tag?: string;
}

/**
 * Two frames of the same look, revealed against each other by a handle you
 * drag across the photograph.
 *
 * The handle is the thumb of a real <input type="range">, not a div with
 * pointer listeners: that buys arrow keys, Home/End, screen-reader semantics
 * and touch for free, and it is one of the few places where the accessible
 * control and the beautiful one can be the same object.
 */
export default function TonalWipe(props: Props) {
  const [at, setAt] = createSignal(52);

  return (
    <figure class="wipe photo">
      <div class="ph">
        <img class="wipe-img" src={props.b} alt="" width="560" height="700" />
        <img
          class="wipe-img wipe-top"
          src={props.a}
          alt={props.alt}
          width="560"
          height="700"
          style={{ 'clip-path': `inset(0 ${100 - at()}% 0 0)` }}
        />
        <span class="wipe-seam" style={{ left: `${at()}%` }} aria-hidden="true">
          <span class="wipe-grip glass-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 6l-5 6 5 6" />
              <path d="M15 6l5 6-5 6" />
            </svg>
          </span>
        </span>
      </div>

      <span class="wipe-label wipe-label-a glass-sm" aria-hidden="true">{props.labelA}</span>
      <span class="wipe-label wipe-label-b glass-sm" aria-hidden="true">{props.labelB}</span>
      {props.tag && <span class="tag">{props.tag}</span>}
      {props.caption && <figcaption>{props.caption}</figcaption>}

      <input
        class="wipe-range"
        type="range"
        min="0"
        max="100"
        step="0.5"
        value={at()}
        onInput={(e) => setAt(e.currentTarget.valueAsNumber)}
        aria-label={`Reveal ${props.labelA} against ${props.labelB}`}
      />
    </figure>
  );
}
