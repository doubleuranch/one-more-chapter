import { useState } from 'react';

interface Props {
  src?: string;
  title: string;
  author: string;
  className?: string;
}

// Deterministic palette so the same book always gets the same color
const PALETTES = [
  { bg: '#DDD5C4', spine: '#C4603B', text: '#4A3D2B' },
  { bg: '#D4ECDE', spine: '#2D6A4F', text: '#173B2E' },
  { bg: '#FAE5DB', spine: '#A34D2E', text: '#562717' },
  { bg: '#EDE8DC', spine: '#8B7355', text: '#2C2416' },
  { bg: '#E8F0ED', spine: '#21523E', text: '#173B2E' },
  { bg: '#F9F0E8', spine: '#C4603B', text: '#4A3D2B' },
  { bg: '#E6DDD0', spine: '#6B5840', text: '#2C2416' },
];

function paletteFor(title: string) {
  const idx = (title.charCodeAt(0) + (title.charCodeAt(title.length - 1) ?? 0)) % PALETTES.length;
  return PALETTES[idx];
}

export default function BookCover({ src, title, author, className = '' }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const p = paletteFor(title);
    return (
      <div
        className={`book-aspect relative overflow-hidden rounded ${className}`}
        style={{ backgroundColor: p.bg }}
      >
        {/* Spine line — mimics a real book cover */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5"
          style={{ backgroundColor: p.spine }}
        />
        {/* Text pinned to the bottom, never overflows */}
        <div className="absolute inset-0 flex flex-col justify-end p-2 pl-3 overflow-hidden">
          <p
            className="font-serif font-bold leading-tight"
            style={{
              color: p.text,
              fontSize: 'clamp(8px, 2.4cqw, 11px)',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </p>
          <p
            className="mt-0.5 leading-tight truncate opacity-60"
            style={{ color: p.text, fontSize: 'clamp(7px, 1.8cqw, 9px)' }}
          >
            {author}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`book-aspect overflow-hidden rounded ${className}`}>
      <img
        src={src}
        alt={`${title} cover`}
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
        loading="lazy"
      />
    </div>
  );
}
