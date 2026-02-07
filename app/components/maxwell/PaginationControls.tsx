

interface PaginationControlsProps {
  total: number;
  current: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  total,
  current,
  pageSize,
  onPageChange,
}: PaginationControlsProps) {
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  return (
    <div
      className="flex items-center justify-between mt-4 pt-4 border-t border-white/10"
      aria-label="Pagination"
    >
      <button
        onClick={() => onPageChange(current - 1)}
        disabled={current === 1}
        className="font-mono text-xs text-white/60 hover:text-white disabled:opacity-50
                   disabled:cursor-not-allowed transition-all-200"
        aria-label="Previous page"
      >
        ← Prev (Alt+←)
      </button>

      <span className="font-mono text-xs text-white/40">
        Page {current} of {totalPages} ({total} items)
      </span>

      <button
        onClick={() => onPageChange(current + 1)}
        disabled={current === totalPages}
        className="font-mono text-xs text-white/60 hover:text-white disabled:opacity-50
                   disabled:cursor-not-allowed transition-all-200"
        aria-label="Next page"
        aria-current={current === totalPages ? 'page' : undefined}
      >
        Next (Alt+→) →
      </button>
    </div>
  );
}
