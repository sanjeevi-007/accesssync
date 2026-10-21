import React from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  total?: number;
  skip?: number;
  limit?: number;
  onPageChange?: (newSkip: number) => void;
  keyExtractor?: (item: T, index: number) => string | number;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No records found.',
  total = 0,
  skip = 0,
  limit = 20,
  onPageChange,
  keyExtractor = (_, i) => i,
}: DataTableProps<T>) {
  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startItem = total === 0 ? 0 : skip + 1;
  const endItem = Math.min(skip + limit, total);

  const handlePrev = () => {
    if (skip > 0 && onPageChange) {
      onPageChange(Math.max(0, skip - limit));
    }
  };

  const handleNext = () => {
    if (skip + limit < total && onPageChange) {
      onPageChange(skip + limit);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-300 overflow-hidden shadow-none">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-[var(--color-surface)] border-b border-gray-300">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className={`px-4 py-3 font-semibold text-[var(--color-text)] ${
                    col.className || ''
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              // Loading Skeleton
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={`sc-${cIdx}`} className="px-4 py-3.5">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-[var(--color-muted)]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 text-gray-400" aria-hidden="true" />
                    <p className="text-sm font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              data.map((item, rowIdx) => (
                <tr
                  key={keyExtractor(item, rowIdx)}
                  className="hover:bg-gray-50 transition-none"
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`px-4 py-3 text-[var(--color-text)] align-middle ${
                        col.className || ''
                      }`}
                    >
                      {col.render
                        ? col.render(item)
                        : col.accessor
                        ? String(item[col.accessor] ?? '')
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {total > 0 && onPageChange && (
        <div className="px-4 py-3 border-t border-gray-200 bg-[var(--color-surface)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--color-muted)]">
          <div>
            Showing <span className="font-semibold text-[var(--color-text)]">{startItem}</span> to{' '}
            <span className="font-semibold text-[var(--color-text)]">{endItem}</span> of{' '}
            <span className="font-semibold text-[var(--color-text)]">{total}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <span className="mr-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={handlePrev}
              disabled={skip === 0 || loading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-gray-300 bg-white text-[var(--color-text)] hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-medium"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={skip + limit >= total || loading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-gray-300 bg-white text-[var(--color-text)] hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-medium"
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
