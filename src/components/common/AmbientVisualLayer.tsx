import { useEffect, useRef } from "react";
import { cn } from "../../utils/cn";

interface AmbientVisualLayerProps {
  className?: string;
  cursorGlow?: boolean;
}

export default function AmbientVisualLayer({ className, cursorGlow = true }: AmbientVisualLayerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootElement = rootRef.current;
    if (rootElement === null || !cursorGlow) return;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover || reducedMotion) return;

    let frame = 0;
    let nextX = 50;
    let nextY = 18;
    let currentX = nextX;
    let currentY = nextY;

    function updatePointer(event: PointerEvent) {
      nextX = (event.clientX / Math.max(1, window.innerWidth)) * 100;
      nextY = (event.clientY / Math.max(1, window.innerHeight)) * 100;
    }

    function animate() {
      const activeRoot = rootRef.current;
      if (!activeRoot) return;
      currentX += (nextX - currentX) * 0.12;
      currentY += (nextY - currentY) * 0.12;
      activeRoot.style.setProperty("--mx", `${currentX.toFixed(2)}%`);
      activeRoot.style.setProperty("--my", `${currentY.toFixed(2)}%`);
      frame = window.requestAnimationFrame(animate);
    }

    window.addEventListener("pointermove", updatePointer, { passive: true });
    frame = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", updatePointer);
    };
  }, [cursorGlow]);

  return (
    <div ref={rootRef} className={cn("ambient-visual-layer", className)} aria-hidden="true">
      <div className="cosmic-backdrop" />
      <div className="soft-blob-layer" />
      <div className="aurora-layer" />
      {cursorGlow ? <div className="cursor-glow-layer" /> : null}
      <div className="noise-layer" />
      <div className="atmosphere-vignette" />
    </div>
  );
}
