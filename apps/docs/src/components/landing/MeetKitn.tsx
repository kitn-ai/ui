/** The animated kitn cat for the brand moment — tracks the cursor and cycles
 *  through expressions when clicked (same playful interaction as kitn.ai). */
import { createSignal } from 'solid-js';
import AnimatedLogo from './AnimatedLogo';

const EXPRESSIONS = ['neutral', 'happy', 'surprised', 'sad', 'angry'] as const;

export default function MeetKitn(props: { size?: number }) {
  const size = props.size ?? 176;
  const [i, setI] = createSignal(0);
  const cycle = () => setI((v) => (v + 1) % EXPRESSIONS.length);

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label="Change the cat's mood"
      title="Click me"
      class="cursor-pointer appearance-none border-0 bg-transparent p-0 leading-none"
    >
      <AnimatedLogo
        width={size}
        height={Math.round(size * 0.92)}
        color="var(--kai-brand)"
        trackCursor
        lookIntensity={2.5}
        expression={EXPRESSIONS[i()]}
      />
    </button>
  );
}
