interface Props {
  initials: string;
  color: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-11 h-11 text-base',
  lg: 'w-16 h-16 text-xl',
};

export default function UserAvatar({ initials, color, src, size = 'md', className = '' }: Props) {
  if (src) {
    return (
      <div className={`rounded-full overflow-hidden shrink-0 ${sizes[size]} ${className}`}>
        <img src={src} alt={initials} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold text-white shrink-0 ${sizes[size]} ${className}`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}
