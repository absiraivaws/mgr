import React from 'react';
import { ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { SortDirection } from './prhTheme';

interface PRHTableHeaderProps {
  label: string;
  sortKey?: string;
  currentSortKey?: string;
  currentSortDir?: SortDirection;
  onSort?: (key: string) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const PRHTableHeader: React.FC<PRHTableHeaderProps> = ({
  label,
  sortKey,
  currentSortKey,
  currentSortDir,
  onSort,
  align = 'left',
  className = '',
}) => {
  const isSortable = !!sortKey && !!onSort;
  const isActive = isSortable && currentSortKey === sortKey && currentSortDir !== null;

  const handleClick = () => {
    if (isSortable && onSort && sortKey) {
      onSort(sortKey);
    }
  };

  const alignClass =
    align === 'right' ? 'justify-end text-right' : align === 'center' ? 'justify-center text-center' : 'justify-start text-left';

  return (
    <th
      onClick={isSortable ? handleClick : undefined}
      className={`py-3 px-3.5 text-[11px] font-semibold uppercase tracking-wider select-none ${
        isSortable ? 'cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition' : ''
      } ${
        isActive
          ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
          : 'text-slate-600 dark:text-slate-400'
      } ${className}`}
    >
      <div className={`flex items-center gap-1.5 ${alignClass}`}>
        <span>{label}</span>
        {isSortable && (
          <span className="shrink-0">
            {isActive ? (
              currentSortDir === 'asc' ? (
                <ChevronUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              )
            ) : (
              <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 opacity-60 hover:opacity-100" />
            )}
          </span>
        )}
      </div>
    </th>
  );
};
