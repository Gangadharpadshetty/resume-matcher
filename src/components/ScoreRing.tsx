import React, { useEffect, useRef } from 'react';

interface ScoreRingProps {
  score: number;
  size?: number;
}

function getScoreColor(score: number): string {
  if (score >= 75) return 'hsl(158 64% 48%)';
  if (score >= 55) return 'hsl(46 100% 58%)';
  if (score >= 35) return 'hsl(25 95% 53%)';
  return 'hsl(0 72% 58%)';
}

function getScoreLabel(score: number): string {
  if (score >= 75) return 'Excellent Match';
  if (score >= 55) return 'Good Match';
  if (score >= 35) return 'Fair Match';
  return 'Needs Work';
}

export const ScoreRing: React.FC<ScoreRingProps> = ({ score, size = 160 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const currentScoreRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.38;
    const lineWidth = size * 0.075;
    const targetScore = score;

    if (animRef.current) cancelAnimationFrame(animRef.current);
    currentScoreRef.current = 0;

    const color = getScoreColor(score);

    function draw(displayScore: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);

      // Background ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'hsl(222 20% 18%)';
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      // Score arc
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (displayScore / 100) * Math.PI * 2;
      
      const gradient = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color.replace('48%)', '65%)'));
      
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Glow effect
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = color.replace(')', ' / 0.2)').replace('hsl(', 'hsla(').replace('/ 0.2)', '/ 0.2)');
      ctx.lineWidth = lineWidth * 2;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Score text
      ctx.fillStyle = 'hsl(210 20% 95%)';
      ctx.font = `bold ${size * 0.22}px Space Grotesk, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(displayScore)}`, cx, cy - size * 0.04);

      ctx.fillStyle = 'hsl(215 15% 55%)';
      ctx.font = `${size * 0.1}px Inter, sans-serif`;
      ctx.fillText('ATS Score', cx, cy + size * 0.14);
    }

    function animate() {
      const step = targetScore / 60;
      currentScoreRef.current = Math.min(currentScoreRef.current + step, targetScore);
      draw(currentScoreRef.current);
      if (currentScoreRef.current < targetScore) {
        animRef.current = requestAnimationFrame(animate);
      }
    }

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [score, size]);

  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="drop-shadow-lg"
      />
      <span
        className="text-sm font-semibold px-3 py-1 rounded-full border"
        style={{
          color,
          background: color.replace(')', ' / 0.12)').replace('hsl(', 'hsl('),
          borderColor: color.replace(')', ' / 0.3)').replace('hsl(', 'hsl('),
        }}
      >
        {label}
      </span>
    </div>
  );
};
