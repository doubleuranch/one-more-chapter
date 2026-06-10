import { useState } from 'react';

interface Props {
  src?: string;
  title: string;
  author: string;
  className?: string;
}

export default function BookCover({ src, title, author, className = '' }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`book-aspect bg-earth-200 flex flex-col items-center justify-center p-2 rounded ${className}`}
      >
        <div className="text-earth-500 text-center">
          <div className="font-serif font-bold text-xs leading-tight line-clamp-3">{title}</div>
          <div className="text-earth-400 text-xs mt-1 line-clamp-1">{author}</div>
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
