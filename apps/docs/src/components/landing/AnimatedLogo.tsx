/** Animated kitn cat — Solid port of the React AnimatedLogo. Blinks on a timer,
 *  optionally tracks the cursor (eyes + face shift), and supports expressions.
 *  Lives in the docs site (an Astro island), not the chat kit. Style bindings are
 *  written as `style={fn()}` so Solid's compiler tracks the signal reads. */
import { createSignal, onMount, onCleanup, mergeProps, type JSX } from 'solid-js';

type LookDirection =
  | 'center' | 'left' | 'right' | 'up' | 'down'
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface AnimatedLogoProps {
  width?: number | string;
  height?: number | string;
  isBlinking?: boolean;
  blinkInterval?: number;
  lookDirection?: LookDirection;
  lookIntensity?: number; // 0 to 1(.5)
  expression?: 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry';
  color?: string;
  class?: string;
  trackCursor?: boolean;
}

export default function AnimatedLogo(raw: AnimatedLogoProps) {
  const props = mergeProps(
    {
      width: 200, height: 183, isBlinking: true, blinkInterval: 8000,
      lookDirection: 'center' as LookDirection, lookIntensity: 1,
      expression: 'neutral' as const, color: '#EC20AF', trackCursor: false,
    },
    raw,
  );

  let containerRef: HTMLDivElement | undefined;
  const [blink, setBlink] = createSignal(false);
  const [internalLook, setInternalLook] = createSignal<LookDirection>(props.lookDirection);

  const lookDirection = (): LookDirection => (props.trackCursor ? internalLook() : props.lookDirection);

  onMount(() => {
    if (props.isBlinking) {
      const timer = window.setInterval(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 200);
      }, props.blinkInterval);
      onCleanup(() => clearInterval(timer));
    }

    if (props.trackCursor) {
      // Remember the last cursor position so we can also re-evaluate the look on
      // scroll — the container moves under a stationary cursor as the page scrolls.
      let lastX = 0, lastY = 0, hasPos = false;
      const update = () => {
        if (!containerRef || !hasPos) return;
        const rect = containerRef.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = rect.width / 4;
        const dy = rect.height / 4;
        const x = lastX, y = lastY;
        if (x < cx - dx && y < cy - dy) setInternalLook('top-left');
        else if (x > cx + dx && y < cy - dy) setInternalLook('top-right');
        else if (x < cx - dx && y > cy + dy) setInternalLook('bottom-left');
        else if (x > cx + dx && y > cy + dy) setInternalLook('bottom-right');
        else if (x < cx - dx) setInternalLook('left');
        else if (x > cx + dx) setInternalLook('right');
        else if (y < cy - dy) setInternalLook('up');
        else if (y > cy + dy) setInternalLook('down');
        else setInternalLook('center');
      };
      const onMove = (e: MouseEvent) => { lastX = e.clientX; lastY = e.clientY; hasPos = true; update(); };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('scroll', update, { passive: true });
      onCleanup(() => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('scroll', update);
      });
    }
  });

  const translate = (dir: LookDirection, n: number): string => {
    switch (dir) {
      case 'left': return `translateX(-${n}px)`;
      case 'right': return `translateX(${n}px)`;
      case 'up': return `translateY(-${n}px)`;
      case 'down': return `translateY(${n}px)`;
      case 'top-left': return `translate(-${n}px, -${n}px)`;
      case 'top-right': return `translate(${n}px, -${n}px)`;
      case 'bottom-left': return `translate(-${n}px, ${n}px)`;
      case 'bottom-right': return `translate(${n}px, ${n}px)`;
      default: return 'translate(0, 0)';
    }
  };

  const getEyeTransform = () => {
    const li = props.lookIntensity;
    let mult = 1;
    if (li === 1) mult = 2;
    if (li === 1.5) mult = 3;
    if (li > 1 && li < 1.5) mult = 2 + (li - 1) / 0.5;
    return translate(lookDirection(), 8 * li * mult);
  };

  const getFaceTransform = () => {
    const li = props.lookIntensity;
    let mult = 1;
    if (li === 1) mult = 2;
    if (li === 1.25) mult = 2.5;
    if (li > 1 && li < 1.25) mult = 2 + ((li - 1) / 0.25) * 0.5;
    return translate(lookDirection(), 4 * li * mult);
  };

  const leftEarTransform = () => {
    switch (props.expression) {
      case 'happy': return 'translate(0, -5px) rotate(-5deg)';
      case 'sad': return 'translate(0, 5px) rotate(5deg)';
      case 'surprised': return 'translate(-3px, -8px) rotate(-8deg)';
      case 'angry': return 'translate(3px, 0) rotate(10deg)';
      default: return 'translate(0, 0)';
    }
  };
  const rightEarTransform = () => {
    switch (props.expression) {
      case 'happy': return 'translate(0, -5px) rotate(5deg)';
      case 'sad': return 'translate(0, 5px) rotate(-5deg)';
      case 'surprised': return 'translate(3px, -8px) rotate(8deg)';
      case 'angry': return 'translate(-3px, 0) rotate(-10deg)';
      default: return 'translate(0, 0)';
    }
  };

  const leftEyeStyle = (): JSX.CSSProperties => {
    if (blink()) return { transform: 'scaleY(0.1)' };
    switch (props.expression) {
      case 'sad': return { transform: 'translateX(10px)' };
      case 'surprised': return { transform: 'scale(1.2)' };
      case 'angry': return { transform: 'translateX(18px)' };
      default: return {};
    }
  };
  const rightEyeStyle = (): JSX.CSSProperties => {
    if (blink()) return { transform: 'scaleY(0.1)' };
    switch (props.expression) {
      case 'sad': return { transform: 'translateX(-10px)' };
      case 'surprised': return { transform: 'scale(1.2)' };
      case 'angry': return { transform: 'translateX(-18px)' };
      default: return {};
    }
  };

  const leftExprStyle = (): JSX.CSSProperties => {
    switch (props.expression) {
      case 'happy': return { opacity: '1', animation: 'moveUp 0.2s ease-out forwards' };
      case 'sad': return { opacity: '1', animation: 'sadLeftWhite 0.4s ease-out forwards' };
      case 'angry': return { opacity: '1', animation: 'angryLeftWhite 0.4s ease-out forwards' };
      default: return { opacity: '0' };
    }
  };
  const rightExprStyle = (): JSX.CSSProperties => {
    switch (props.expression) {
      case 'happy': return { opacity: '1', animation: 'moveUp 0.2s ease-out forwards' };
      case 'sad': return { opacity: '1', animation: 'sadRightWhite 0.4s ease-out forwards' };
      case 'angry': return { opacity: '1', animation: 'angryRightWhite 0.4s ease-out forwards' };
      default: return { opacity: '0' };
    }
  };

  const css = () =>
    `.primary{fill:${props.color}}.secondary{fill:#fff}.eye{transition:transform .3s ease}.eye-shape{transition:all .3s ease;transform-origin:center}.face{transition:transform .3s ease}.ear{transition:transform .4s ease;transform-origin:center}.expression-circle{transition:all .3s ease;transform-origin:center}@keyframes moveUp{0%{transform:translate(0,30px);opacity:1}100%{transform:translate(0,20px);opacity:1}}@keyframes sadLeftWhite{0%{transform:translate(-20px,-20px);opacity:.5}100%{transform:translateX(-5px) translateY(-10px);opacity:1}}@keyframes sadRightWhite{0%{transform:translate(20px,-20px);opacity:.5}100%{transform:translateX(5px) translateY(-10px);opacity:1}}@keyframes angryLeftWhite{0%{transform:translate(20px,-20px);opacity:1}100%{transform:translateX(32px) translateY(-15px);opacity:1}}@keyframes angryRightWhite{0%{transform:translate(-20px,-20px);opacity:1}100%{transform:translateX(-32px) translateY(-15px);opacity:1}}`;

  return (
    <div ref={containerRef} class={`relative ${props.class ?? ''}`}>
      <svg
        width={props.width}
        height={props.height}
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="animated-logo"
      >
        <g transform="translate(0, 17)">
          <style>{css()}</style>

          <path class="primary ear" style={{ transform: leftEarTransform() }}
            d="M10.1401 13.6007C9.77828 5.71178 18.2364 0.505236 25.1168 4.3815L86.8498 39.1602C93.8849 43.1236 93.6125 53.3447 86.3764 56.9278L27.5742 86.0447C21.0714 89.2647 13.4034 84.7451 13.0709 77.4964L10.1401 13.6007Z" />

          <path class="primary ear" style={{ transform: rightEarTransform() }}
            d="M170.688 1.64004C176.98 -2.59715 185.459 1.86273 185.532 9.44774L186.16 74.7003C186.227 81.618 179.128 86.2965 172.797 83.5076L113.842 57.5369C106.978 54.5135 106.14 45.1113 112.361 40.9219L170.688 1.64004Z" />

          <path class="primary" fill-rule="evenodd" clip-rule="evenodd"
            d="M0 93C0 60.4152 26.4152 34 59 34H141C173.585 34 200 60.4152 200 93V124C200 156.585 173.585 183 141 183H59C26.4152 183 0 156.585 0 124V93Z" />

          <path class="secondary face" style={{ transform: getFaceTransform() }}
            d="M20.4737 107.047C18.6486 85.6379 34.1956 66.665 55.5462 64.2465L136.275 55.1017C160.901 52.3121 182.03 72.5289 180.33 97.2544L178.38 125.618C176.824 148.246 156.652 164.968 134.127 162.303L56.2013 153.081C37.497 150.867 22.9256 135.81 21.3258 117.044L20.4737 107.047Z" />

          <g class="eye" style={{ transform: getEyeTransform() }}>
            <circle cx="60.5814" cy="103.974" r="16.1376" class="primary eye-shape" style={leftEyeStyle()} />
            <circle cx="139.947" cy="103.974" r="16.1376" class="primary eye-shape" style={rightEyeStyle()} />
            <circle cx="60.5814" cy="103.974" r="16.1376" class="secondary expression-circle" style={leftExprStyle()} />
            <circle cx="139.947" cy="103.974" r="16.1376" class="secondary expression-circle" style={rightExprStyle()} />
          </g>
        </g>
      </svg>
    </div>
  );
}
