// Reusable skeleton primitives for loading states

function Pulse({ className }: { className: string }) {
  return <div className={`bg-earth-200 rounded skeleton-pulse ${className}`} />;
}

/** Matches the BookCard layout (cover + title + author) */
export function SkeletonBookCard() {
  return (
    <div className="flex flex-col gap-2">
      <Pulse className="w-full book-aspect rounded-lg" />
      <Pulse className="h-3.5 w-4/5 rounded" />
      <Pulse className="h-3 w-3/5 rounded" />
    </div>
  );
}

/** Matches the ActivityItem card layout */
export function SkeletonActivityItem() {
  return (
    <div className="bg-white rounded-2xl border border-earth-200 p-4 flex gap-3">
      {/* Avatar */}
      <Pulse className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 flex gap-3">
        <div className="flex-1 space-y-2">
          <Pulse className="h-3.5 w-3/4 rounded" />
          <Pulse className="h-3 w-1/2 rounded" />
          <Pulse className="h-10 w-full rounded-lg mt-3" />
          <Pulse className="h-3 w-1/3 rounded" />
        </div>
        {/* Book thumbnail */}
        <Pulse className="w-14 h-20 rounded-md shrink-0" />
      </div>
    </div>
  );
}
