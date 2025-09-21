import React from 'react';
import { cn } from '../utils/cn';

interface Column<T> {
  key: keyof T;
  title: string;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
  emptyMessage?: string;
}

export function DataTable<T>({ 
  data, 
  columns, 
  className,
  emptyMessage = 'No data available'
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className={cn('text-center py-8 text-secondary-500', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-secondary-200">
            {columns.map((column, index) => (
              <th
                key={index}
                className={cn(
                  'px-4 py-3 text-left text-sm font-medium text-secondary-600',
                  column.className
                )}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-secondary-100 hover:bg-secondary-50"
            >
              {columns.map((column, colIndex) => (
                <td
                  key={colIndex}
                  className={cn(
                    'px-4 py-3 text-sm text-secondary-900',
                    column.className
                  )}
                >
                  {column.render 
                    ? column.render(item[column.key], item)
                    : String(item[column.key] || '')
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
