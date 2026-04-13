"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  mobileLabel?: string; // Label to show on mobile view
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  className?: string;
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  emptyMessage = "No data available",
  className = "",
}: ResponsiveTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className={`w-full ${className}`}>
          <thead>
            <tr className="border-b">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-4 py-3 text-sm font-semibold text-gray-700"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => {
              const rowKey = keyExtractor(item);
              return (
                <tr key={rowKey} className="border-b hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm">
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="md:hidden space-y-3">
        {data.map((item) => {
          const rowKey = keyExtractor(item);
          const isExpanded = expandedRows.has(rowKey);
          
          // First column is the "primary" info shown by default
          const primaryCol = columns[0];
          const secondaryCol = columns[1];
          const remainingCols = columns.slice(2);

          return (
            <div
              key={rowKey}
              className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
            >
              {/* Always Visible Section */}
              <div
                className="p-4 cursor-pointer active:bg-gray-50"
                onClick={() => toggleRow(rowKey)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 mb-1">
                      {primaryCol.render
                        ? primaryCol.render(item)
                        : item[primaryCol.key]}
                    </div>
                    {secondaryCol && (
                      <div className="text-sm text-gray-600 truncate">
                        {secondaryCol.render
                          ? secondaryCol.render(item)
                          : item[secondaryCol.key]}
                      </div>
                    )}
                  </div>
                  <button
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expandable Section */}
              {isExpanded && remainingCols.length > 0 && (
                <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-3">
                  {remainingCols.map((col) => (
                    <div key={col.key} className="flex flex-col">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        {col.mobileLabel || col.label}
                      </span>
                      <div className="text-sm text-gray-900">
                        {col.render ? col.render(item) : item[col.key]}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
