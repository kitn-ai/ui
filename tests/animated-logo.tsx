"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export interface AnimatedLogoProps {
  width?: number | string;
  height?: number | string;
  isBlinking?: boolean;
  blinkInterval?: number;
  lookDirection?:
    | "center"
    | "left"
    | "right"
    | "up"
    | "down"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  lookIntensity?: number; // 0 to 1
  expression?: "neutral" | "happy" | "sad" | "surprised" | "angry";
  color?: string;
  className?: string;
  trackCursor?: boolean;
}

export default function AnimatedLogo({
  width = 200,
  height = 183,
  isBlinking = true,
  blinkInterval = 8000,
  lookDirection: externalLookDirection = "center",
  lookIntensity = 1,
  expression = "neutral",
  color = "#EC20AF",
  className,
  trackCursor = false,
}: AnimatedLogoProps) {
  const [blink, setBlink] = useState(false);
  const [internalLookDirection, setInternalLookDirection] = useState<
    AnimatedLogoProps["lookDirection"]
  >(externalLookDirection);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use the internal direction when tracking cursor, otherwise use the external one
  const lookDirection = trackCursor
    ? internalLookDirection
    : externalLookDirection;

  // Handle blinking animation
  useEffect(() => {
    if (!isBlinking) return;

    const blinkTimer = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
    }, blinkInterval);

    return () => clearInterval(blinkTimer);
  }, [isBlinking, blinkInterval]);

  // Handle cursor tracking
  useEffect(() => {
    if (!trackCursor) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      // Get container position and dimensions
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate mouse position relative to center
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Determine look direction based on mouse position
      if (
        mouseX < centerX - rect.width / 4 &&
        mouseY < centerY - rect.height / 4
      ) {
        setInternalLookDirection("top-left");
      } else if (
        mouseX > centerX + rect.width / 4 &&
        mouseY < centerY - rect.height / 4
      ) {
        setInternalLookDirection("top-right");
      } else if (
        mouseX < centerX - rect.width / 4 &&
        mouseY > centerY + rect.height / 4
      ) {
        setInternalLookDirection("bottom-left");
      } else if (
        mouseX > centerX + rect.width / 4 &&
        mouseY > centerY + rect.height / 4
      ) {
        setInternalLookDirection("bottom-right");
      } else if (mouseX < centerX - rect.width / 4) {
        setInternalLookDirection("left");
      } else if (mouseX > centerX + rect.width / 4) {
        setInternalLookDirection("right");
      } else if (mouseY < centerY - rect.height / 4) {
        setInternalLookDirection("up");
      } else if (mouseY > centerY + rect.height / 4) {
        setInternalLookDirection("down");
      } else {
        setInternalLookDirection("center");
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [trackCursor]);

  // Calculate eye transformations based on look direction and intensity
  // Double the intensity when at 100%, triple it at 150%
  const getEyeTransform = () => {
    // Apply multiplier based on intensity value
    let intensityMultiplier = 1;
    if (lookIntensity === 1) intensityMultiplier = 2;
    if (lookIntensity === 1.5) intensityMultiplier = 3;

    // For values between 1.0 and 1.5, scale proportionally between 2x and 3x
    if (lookIntensity > 1 && lookIntensity < 1.5) {
      const fraction = (lookIntensity - 1) / 0.5; // 0 to 1 scale between 1.0 and 1.5
      intensityMultiplier = 2 + fraction;
    }

    const baseIntensity = 8 * lookIntensity * intensityMultiplier;

    switch (lookDirection) {
      case "left":
        return `translateX(-${baseIntensity}px)`;
      case "right":
        return `translateX(${baseIntensity}px)`;
      case "up":
        return `translateY(-${baseIntensity}px)`;
      case "down":
        return `translateY(${baseIntensity}px)`;
      case "top-left":
        return `translate(-${baseIntensity}px, -${baseIntensity}px)`;
      case "top-right":
        return `translate(${baseIntensity}px, -${baseIntensity}px)`;
      case "bottom-left":
        return `translate(-${baseIntensity}px, ${baseIntensity}px)`;
      case "bottom-right":
        return `translate(${baseIntensity}px, ${baseIntensity}px)`;
      default:
        return "translate(0, 0)";
    }
  };

  // Calculate face transformations based on look direction and intensity
  const getFaceTransform = () => {
    // Apply multiplier based on intensity value
    let intensityMultiplier = 1;
    if (lookIntensity === 1) intensityMultiplier = 2;
    if (lookIntensity === 1.25) intensityMultiplier = 2.5;

    // For values between 1.0 and 1.25, scale proportionally between 2x and 2.5x
    if (lookIntensity > 1 && lookIntensity < 1.25) {
      const fraction = (lookIntensity - 1) / 0.25; // 0 to 1 scale between 1.0 and 1.25
      intensityMultiplier = 2 + fraction * 0.5;
    }

    const baseIntensity = 4 * lookIntensity * intensityMultiplier;

    switch (lookDirection) {
      case "left":
        return `translateX(-${baseIntensity}px)`;
      case "right":
        return `translateX(${baseIntensity}px)`;
      case "up":
        return `translateY(-${baseIntensity}px)`;
      case "down":
        return `translateY(${baseIntensity}px)`;
      case "top-left":
        return `translate(-${baseIntensity}px, -${baseIntensity}px)`;
      case "top-right":
        return `translate(${baseIntensity}px, -${baseIntensity}px)`;
      case "bottom-left":
        return `translate(-${baseIntensity}px, ${baseIntensity}px)`;
      case "bottom-right":
        return `translate(${baseIntensity}px, ${baseIntensity}px)`;
      default:
        return "translate(0, 0)";
    }
  };

  // Get left ear transformations based on expression
  const getLeftEarTransform = () => {
    switch (expression) {
      case "happy":
        return "translate(0, -5px) rotate(-5deg)";
      case "sad":
        return "translate(0, 5px) rotate(5deg)";
      case "surprised":
        return "translate(-3px, -8px) rotate(-8deg)";
      case "angry":
        return "translate(3px, 0) rotate(10deg)";
      default:
        return "translate(0, 0)";
    }
  };

  // Get right ear transformations based on expression
  const getRightEarTransform = () => {
    switch (expression) {
      case "happy":
        return "translate(0, -5px) rotate(5deg)";
      case "sad":
        return "translate(0, 5px) rotate(-5deg)";
      case "surprised":
        return "translate(3px, -8px) rotate(8deg)";
      case "angry":
        return "translate(-3px, 0) rotate(-10deg)";
      default:
        return "translate(0, 0)";
    }
  };

  // Get left eye style based on expression and blinking
  const getLeftEyeStyle = () => {
    if (blink) {
      return { transform: "scaleY(0.1)" };
    }

    switch (expression) {
      case "happy":
        return { opacity: 1 };
      case "sad":
        return { transform: "translateX(10px)" };
      case "surprised":
        return { transform: "scale(1.2)" };
      case "angry":
        return { transform: "translateX(18px)" };
      default:
        return {};
    }
  };

  // Get right eye style based on expression and blinking
  const getRightEyeStyle = () => {
    if (blink) {
      return { transform: "scaleY(0.1)" };
    }

    switch (expression) {
      case "happy":
        return { opacity: 1 };
      case "sad":
        return { transform: "translateX(-10px)" };
      case "surprised":
        return { transform: "scale(1.2)" };
      case "angry":
        return { transform: "translateX(-18px)" };
      default:
        return {};
    }
  };

  // Get left expression circle style
  const getLeftExpressionStyle = () => {
    switch (expression) {
      case "happy":
        return {
          opacity: 1,
          animation: "moveUp 0.2s ease-out forwards",
        };
      case "sad":
        return {
          opacity: 1,
          animation: "sadLeftWhite 0.4s ease-out forwards",
        };
      case "angry":
        return {
          opacity: 1,
          animation: "angryLeftWhite 0.4s ease-out forwards",
        };
      default:
        return { opacity: 0 };
    }
  };

  // Get right expression circle style
  const getRightExpressionStyle = () => {
    switch (expression) {
      case "happy":
        return {
          opacity: 1,
          animation: "moveUp 0.2s ease-out forwards",
        };
      case "sad":
        return {
          opacity: 1,
          animation: "sadRightWhite 0.4s ease-out forwards",
        };
      case "angry":
        return {
          opacity: 1,
          animation: "angryRightWhite 0.4s ease-out forwards",
        };
      default:
        return { opacity: 0 };
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("animated-logo", className)}
      >
        <g transform="translate(0, 17)">
          <style>
            {`.primary{fill:${color}}.secondary{fill:white}.eye{transition:transform .3s ease}.eye-shape{transition:all .3s ease;transform-origin:center}.face{transition:transform .3s ease}.ear{transition:transform .4s ease;transform-origin:center}.expression-circle{transition:all .3s ease;transform-origin:center}@keyframes moveUp{0%{transform:translate(0,30px);opacity:1}100%{transform:translate(0,20px);opacity:1}}@keyframes sadLeftEye{0%{transform:translate(-20px,-20px);opacity:.7}100%{transform:translateX(10px);opacity:1}}@keyframes sadRightEye{0%{transform:translate(20px,-20px);opacity:.7}100%{transform:translateX(-10px);opacity:1}}@keyframes sadLeftWhite{0%{transform:translate(-20px,-20px);opacity:.5}100%{transform:translateX(-5px) translateY(-10px);opacity:1}}@keyframes sadRightWhite{0%{transform:translate(20px,-20px);opacity:.5}100%{transform:translateX(5px) translateY(-10px);opacity:1}}@keyframes angryLeftWhite{0%{transform:translate(20px,-20px);opacity:1}100%{transform:translateX(32px) translateY(-15px);opacity:1}}@keyframes angryRightWhite{0%{transform:translate(-20px,-20px);opacity:1}100%{transform:translateX(-32px) translateY(-15px);opacity:1}}`}
          </style>

          {/* Left ear */}
          <path
            className="primary ear"
            d="M10.1401 13.6007C9.77828 5.71178 18.2364 0.505236 25.1168 4.3815L86.8498 39.1602C93.8849 43.1236 93.6125 53.3447 86.3764 56.9278L27.5742 86.0447C21.0714 89.2647 13.4034 84.7451 13.0709 77.4964L10.1401 13.6007Z"
            style={{ transform: getLeftEarTransform() }}
          />

          {/* Right ear */}
          <path
            className="primary ear"
            d="M170.688 1.64004C176.98 -2.59715 185.459 1.86273 185.532 9.44774L186.16 74.7003C186.227 81.618 179.128 86.2965 172.797 83.5076L113.842 57.5369C106.978 54.5135 106.14 45.1113 112.361 40.9219L170.688 1.64004Z"
            style={{ transform: getRightEarTransform() }}
          />

          {/* Head */}
          <path
            className="primary"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0 93C0 60.4152 26.4152 34 59 34H141C173.585 34 200 60.4152 200 93V124C200 156.585 173.585 183 141 183H59C26.4152 183 0 156.585 0 124V93Z"
          />

          {/* Face */}
          <path
            className="secondary face"
            d="M20.4737 107.047C18.6486 85.6379 34.1956 66.665 55.5462 64.2465L136.275 55.1017C160.901 52.3121 182.03 72.5289 180.33 97.2544L178.38 125.618C176.824 148.246 156.652 164.968 134.127 162.303L56.2013 153.081C37.497 150.867 22.9256 135.81 21.3258 117.044L20.4737 107.047Z"
            style={{ transform: getFaceTransform() }}
          />

          {/* Eyes group - for directional movement */}
          <g className="eye" style={{ transform: getEyeTransform() }}>
            {/* Main eyes */}
            <circle
              cx="60.5814"
              cy="103.974"
              r="16.1376"
              className="primary eye-shape"
              style={getLeftEyeStyle()}
            />

            <circle
              cx="139.947"
              cy="103.974"
              r="16.1376"
              className="primary eye-shape"
              style={getRightEyeStyle()}
            />

            {/* Expression circles */}
            <circle
              cx="60.5814"
              cy="103.974"
              r="16.1376"
              className="secondary expression-circle"
              style={getLeftExpressionStyle()}
            />

            <circle
              cx="139.947"
              cy="103.974"
              r="16.1376"
              className="secondary expression-circle"
              style={getRightExpressionStyle()}
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
