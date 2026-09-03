import { createSignal } from 'solid-js';
import type { Material } from '../data/types';
import './material-well.css';

/**
 * A material, sunk into a neumorphic well. Hover or focus lifts the crop
 * toward you and lets the copy in.
 *
 * It is a <button> with aria-expanded rather than a hover-only card, because
 * the copy is the content -- putting it behind a pointer would hide the
 * substance of the page from anyone not using one.
 */
export default function MaterialWell(props: { material: Material }) {
  const [open, setOpen] = createSignal(false);

  return (
    <button
      class="material neu-well"
      classList={{ open: open() }}
      aria-expanded={open()}
      onClick={() => setOpen(!open())}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span class="material-crop">
        <img src={props.material.image} alt="" width="600" height="600" loading="lazy" />
      </span>
      <span class="material-body">
        <span class="kicker">{props.material.origin}</span>
        <span class="material-name serif">{props.material.name}</span>
        <span class="material-copy">{props.material.copy}</span>
      </span>
    </button>
  );
}
