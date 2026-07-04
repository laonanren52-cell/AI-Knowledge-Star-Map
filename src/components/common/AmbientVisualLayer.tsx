import { useEffect, useRef } from "react";
import { cn } from "../../utils/cn";

interface AmbientVisualLayerProps {
  className?: string;
  cursorGlow?: boolean;
}

export default function AmbientVisualLayer({ className, cursorGlow = true }: AmbientVisualLayerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const canvasElement = canvas;
    const ctx = context;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const nodeCount = coarsePointer ? 54 : 128;
    const focalLength = 820;
    let width = 0;
    let height = 0;
    let frame = 0;
    let angle = 0;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let nodes: Array<{ x: number; y: number; z: number; radius: number }> = [];

    function initGraph() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      width = window.innerWidth;
      height = window.innerHeight;
      canvasElement.width = Math.floor(width * dpr);
      canvasElement.height = Math.floor(height * dpr);
      canvasElement.style.width = `${width}px`;
      canvasElement.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = Array.from({ length: nodeCount }, () => ({
        x: (Math.random() - 0.5) * 2300,
        y: (Math.random() - 0.5) * 1800,
        z: Math.random() * 1900 - 950,
        radius: Math.random() * 1.5 + 0.55,
      }));
    }

    function updatePointer(event: PointerEvent) {
      mouseX = event.clientX;
      mouseY = event.clientY;
    }

    function renderGraph() {
      ctx.clearRect(0, 0, width, height);
      angle += reducedMotion ? 0 : 0.00065;
      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);
      const parallaxX = mouseX - width / 2;
      const parallaxY = mouseY - height / 2;

      const projected = nodes
        .map((node) => {
          let rotatedX = node.x * cosA - node.z * sinA;
          const rotatedZ = node.z * cosA + node.x * sinA;
          let rotatedY = node.y;
          rotatedX -= parallaxX * (rotatedZ / 7800);
          rotatedY -= parallaxY * (rotatedZ / 7800);
          const scale = focalLength / (focalLength + rotatedZ);
          return {
            px: rotatedX * scale + width / 2,
            py: rotatedY * scale + height / 2,
            scale,
            z: rotatedZ,
            radius: node.radius,
          };
        })
        .filter((node) => node.scale > 0.18 && node.px > -120 && node.px < width + 120 && node.py > -120 && node.py < height + 120)
        .sort((a, b) => b.z - a.z);

      for (let i = 0; i < projected.length; i += 1) {
        const first = projected[i];
        for (let j = i + 1; j < projected.length; j += 1) {
          const second = projected[j];
          const distance = Math.hypot(first.px - second.px, first.py - second.py);
          const threshold = 118 * first.scale;
          if (distance < threshold) {
            const alpha = Math.max(0, 0.07 * first.scale * (1 - distance / threshold));
            ctx.beginPath();
            ctx.moveTo(first.px, first.py);
            ctx.lineTo(second.px, second.py);
            ctx.strokeStyle = `rgba(31, 86, 135, ${alpha})`;
            ctx.lineWidth = Math.max(0.35, first.scale);
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(first.px, first.py, Math.max(0.55, first.radius * first.scale), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 102, 204, ${Math.min(0.32, first.scale * 0.24)})`;
        ctx.fill();
      }

      if (!reducedMotion) frame = window.requestAnimationFrame(renderGraph);
    }

    initGraph();
    renderGraph();
    window.addEventListener("resize", initGraph);
    window.addEventListener("pointermove", updatePointer, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", initGraph);
      window.removeEventListener("pointermove", updatePointer);
    };
  }, []);

  return (
    <div ref={rootRef} className={cn("ambient-visual-layer", className)} aria-hidden="true">
      <canvas ref={canvasRef} className="light-graph-canvas" />
      <div className="cosmic-backdrop" />
      <div className="soft-blob-layer" />
      <div className="aurora-layer" />
      {cursorGlow ? <div className="cursor-glow-layer" /> : null}
      <div className="noise-layer" />
      <div className="atmosphere-vignette" />
    </div>
  );
}
