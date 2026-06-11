import { useEffect, useState } from 'react';
import { subscribeConfetti } from '../lib/confetti';

const COLORS = ['#C4603B', '#2D6A4F', '#DF7A56', '#4CA873', '#EBA080', '#8B7355', '#77C297', '#A34D2E'];

interface Particle {
  id: number;
  color: string;
  round: boolean;
  tx: string;
  ty: string;
  rot: string;
  size: number;
  delay: number;
  duration: number;
}

function makeParticles(count = 36): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
    const dist = 120 + Math.random() * 180;
    return {
      id: i,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      round: Math.random() > 0.5,
      tx: `${Math.cos(angle) * dist}px`,
      ty: `${Math.sin(angle) * dist - 60}px`,
      rot: `${Math.random() * 600 - 300}deg`,
      size: 6 + Math.floor(Math.random() * 7),
      delay: Math.random() * 0.15,
      duration: 0.9 + Math.random() * 0.5,
    };
  });
}

export default function ConfettiBurst() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [active, setActive] = useState(false);

  useEffect(() => subscribeConfetti(v => {
    if (v) setParticles(makeParticles(36));
    setActive(v);
  }), []);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] flex items-center justify-center">
      {particles.map(p => (
        <div
          key={p.id}
          className={`absolute ${p.round ? 'rounded-full' : 'rounded-sm'}`}
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s ease-out ${p.delay}s both`,
            '--tx': p.tx,
            '--ty': p.ty,
            '--rot': p.rot,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
