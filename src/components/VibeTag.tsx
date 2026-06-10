interface Props {
  tag: string;
  onClick?: () => void;
  selected?: boolean;
  small?: boolean;
}

export default function VibeTag({ tag, onClick, selected, small }: Props) {
  const base = small ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';
  const style = selected
    ? 'bg-terracotta-500 text-white border-terracotta-500'
    : 'bg-cream-100 text-earth-600 border-earth-300 hover:border-terracotta-400 hover:text-terracotta-600';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${style} rounded-full border font-medium transition-colors`}
    >
      {tag}
    </button>
  );
}
