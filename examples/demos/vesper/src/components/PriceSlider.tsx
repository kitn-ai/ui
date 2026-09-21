import './price-slider.css';
import { money } from '../lib/format';

/**
 * A dual-thumb price band: two native range inputs stacked over one
 * neumorphic well. Two real inputs rather than a custom widget, so each thumb
 * is separately labelled, keyboard-driven and announced.
 */
export default function PriceSlider(props: {
  min: number;
  max: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
}) {
  const pct = (v: number) =>
    ((v - props.min) / Math.max(1, props.max - props.min)) * 100;

  return (
    <div class="price">
      <div class="price-head">
        <span class="kicker">Price</span>
        <span class="price-band">
          {money(props.low)} – {money(props.high)}
        </span>
      </div>

      <div class="price-track neu-well">
        <div
          class="price-fill"
          style={{ left: `${pct(props.low)}%`, right: `${100 - pct(props.high)}%` }}
        />
        <input
          class="price-input price-input-low"
          type="range"
          min={props.min}
          max={props.max}
          step="10"
          value={props.low}
          aria-label="Lowest price"
          onInput={(e) =>
            props.onChange(
              Math.min(e.currentTarget.valueAsNumber, props.high),
              props.high,
            )
          }
        />
        <input
          class="price-input price-input-high"
          type="range"
          min={props.min}
          max={props.max}
          step="10"
          value={props.high}
          aria-label="Highest price"
          onInput={(e) =>
            props.onChange(
              props.low,
              Math.max(e.currentTarget.valueAsNumber, props.low),
            )
          }
        />
      </div>
    </div>
  );
}
