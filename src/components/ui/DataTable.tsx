/**
 * ============================================================================
 * COREX: Data Table Component
 * Description: Professional data table with sorting, filtering, and pagination
 * ============================================================================
 */

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (value: T[keyof T], row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  /** Table columns configuration */
  columns: Column<T>[];
  /** Table data */
  data: T[];
  /** Unique key for each row */
  rowKey: keyof T;
  /** Enable row selection */
  selectable?: boolean;
  /** Selected row keys */
  selectedKeys?: Set<string | number>;
  /** Selection change handler */
  onSelectionChange?: (keys: Set<string | number>) => void;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Enable search */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Current search query */
  searchQuery?: string;
  /** Search change handler */
  onSearchChange?: (query: string) => void;
  /** Searchable columns */
  searchColumns?: (keyof T)[];
  /** Enable pagination */
  paginated?: boolean;
  /** Items per page */
  pageSize?: number;
  /** Current page */
  currentPage?: number;
  /** Page change handler */
  onPageChange?: (page: number) => void;
  /** Total items count (for server pagination) */
  totalItems?: number;
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Custom class names */
  className?: string;
  /** Sticky header */
  stickyHeader?: boolean;
  /**
   * Enable row animations with framer-motion.
   * Set to false for large datasets (100+ rows) to improve performance.
   * Framer-motion on table rows adds overhead that scales with row count.
   * @default true
   */
  animateRows?: boolean;
}

// ============================================================================
// SORT UTILITIES
// ============================================================================

type SortDirection = "asc" | "desc" | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

// ============================================================================
// DATA TABLE COMPONENT
// ============================================================================

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  onRowClick,
  searchable = false,
  searchPlaceholder = "Search...",
  searchQuery: externalSearchQuery,
  onSearchChange,
  searchColumns,
  paginated = false,
  pageSize = 10,
  currentPage: externalCurrentPage,
  onPageChange,
  totalItems,
  loading = false,
  emptyMessage = "No data available",
  className,
  stickyHeader = false,
  animateRows = true,
}: DataTableProps<T>) {
  // Internal state for uncontrolled mode
  const [internalSearchQuery, setInternalSearchQuery] = React.useState("");
  const [internalCurrentPage, setInternalCurrentPage] = React.useState(1);
  const [sortState, setSortState] = React.useState<SortState>({
    column: null,
    direction: null,
  });

  // Use external or internal state
  const searchQuery = externalSearchQuery ?? internalSearchQuery;
  const currentPage = externalCurrentPage ?? internalCurrentPage;

  // Handle search change
  const handleSearchChange = (query: string) => {
    if (onSearchChange) {
      onSearchChange(query);
    } else {
      setInternalSearchQuery(query);
      setInternalCurrentPage(1); // Reset to first page on search
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    } else {
      setInternalCurrentPage(page);
    }
  };

  // Handle sort
  const handleSort = (columnKey: string) => {
    setSortState((prev) => {
      if (prev.column === columnKey) {
        const nextDirection: SortDirection =
          prev.direction === "asc"
            ? "desc"
            : prev.direction === "desc"
              ? null
              : "asc";
        return {
          column: nextDirection ? columnKey : null,
          direction: nextDirection,
        };
      }
      return { column: columnKey, direction: "asc" };
    });
  };

  // Filter data by search query
  const filteredData = React.useMemo(() => {
    if (!searchQuery || !searchColumns) return data;

    const query = searchQuery.toLowerCase();
    return data.filter((row) =>
      searchColumns.some((col) => {
        const value = row[col];
        return value?.toString().toLowerCase().includes(query);
      }),
    );
  }, [data, searchQuery, searchColumns]);

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortState.column || !sortState.direction) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortState.column as keyof T];
      const bValue = b[sortState.column as keyof T];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return sortState.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortState]);

  // Paginate data
  const paginatedData = React.useMemo(() => {
    if (!paginated) return sortedData;

    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, paginated, currentPage, pageSize]);

  // Calculate total pages
  const totalPages = React.useMemo(() => {
    const total = totalItems ?? sortedData.length;
    return Math.ceil(total / pageSize);
  }, [totalItems, sortedData.length, pageSize]);

  // Selection handlers
  const allSelected =
    selectable &&
    paginatedData.length > 0 &&
    paginatedData.every((row) =>
      selectedKeys.has(row[rowKey] as string | number),
    );

  const someSelected =
    selectable &&
    paginatedData.some((row) =>
      selectedKeys.has(row[rowKey] as string | number),
    ) &&
    !allSelected;

  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (allSelected) {
      const newKeys = new Set(selectedKeys);
      paginatedData.forEach((row) =>
        newKeys.delete(row[rowKey] as string | number),
      );
      onSelectionChange(newKeys);
    } else {
      const newKeys = new Set(selectedKeys);
      paginatedData.forEach((row) =>
        newKeys.add(row[rowKey] as string | number),
      );
      onSelectionChange(newKeys);
    }
  };

  const handleSelectRow = (row: T) => {
    if (!onSelectionChange) return;

    const key = row[rowKey] as string | number;
    const newKeys = new Set(selectedKeys);

    if (newKeys.has(key)) {
      newKeys.delete(key);
    } else {
      newKeys.add(key);
    }

    onSelectionChange(newKeys);
  };

  // Get sort icon
  const getSortIcon = (columnKey: string) => {
    if (sortState.column !== columnKey) {
      return <ChevronsUpDown className="h-4 w-4 opacity-50" />;
    }
    if (sortState.direction === "asc") {
      return <ChevronUp className="h-4 w-4" />;
    }
    return <ChevronDown className="h-4 w-4" />;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Bar */}
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--foreground-muted))]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn(
              "w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--input))]",
              "py-2 pl-10 pr-10 text-sm",
              "placeholder:text-[rgb(var(--foreground-muted))]",
              "focus:border-[rgb(var(--ring))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--ring))]",
              "transition-colors",
            )}
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--foreground-muted))] hover:text-[rgb(var(--foreground))]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Table Container */}
      <div className="table-container">
        <table>
          {/* Header */}
          <thead className={stickyHeader ? "sticky top-0 z-10" : ""}>
            <tr>
              {selectable && (
                <th className="w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-[rgb(var(--border))]"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key as string}
                  style={{ width: column.width }}
                  className={cn(
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right",
                    column.sortable && "cursor-pointer select-none",
                  )}
                  onClick={() =>
                    column.sortable && handleSort(column.key as string)
                  }
                >
                  <div
                    className={cn(
                      "flex items-center gap-2",
                      column.align === "center" && "justify-center",
                      column.align === "right" && "justify-end",
                    )}
                  >
                    {column.header}
                    {column.sortable && getSortIcon(column.key as string)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            <AnimatePresence mode="popLayout">
              {loading ? (
                // Loading skeleton
                Array.from({ length: pageSize }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    {selectable && (
                      <td>
                        <div className="h-4 w-4 animate-shimmer rounded" />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td key={column.key as string}>
                        <div className="h-4 animate-shimmer rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                // Empty state
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="py-12 text-center text-[rgb(var(--foreground-muted))]"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                // Data rows - conditionally animated based on animateRows prop
                paginatedData.map((row, index) => {
                  const rowKeyValue = row[rowKey] as string | number;
                  const isSelected = selectedKeys.has(rowKeyValue);

                  /**
                   * Row content extracted to avoid duplication between
                   * animated and static rendering paths
                   */
                  const rowContent = (
                    <>
                      {selectable && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(row)}
                            className="h-4 w-4 rounded border-[rgb(var(--border))]"
                          />
                        </td>
                      )}
                      {columns.map((column) => (
                        <td
                          key={column.key as string}
                          className={cn(
                            column.align === "center" && "text-center",
                            column.align === "right" && "text-right",
                          )}
                        >
                          {column.render
                            ? column.render(
                                row[column.key as keyof T],
                                row,
                                (currentPage - 1) * pageSize + index,
                              )
                            : (row[column.key as keyof T] as React.ReactNode)}
                        </td>
                      ))}
                    </>
                  );

                  const rowClassName = cn(
                    onRowClick && "cursor-pointer",
                    isSelected && "bg-[rgb(var(--accent)_/_0.1)]",
                  );

                  /**
                   * Render animated rows only when animateRows is true.
                   * For large datasets, animations add significant overhead
                   * as each motion.tr manages its own animation state.
                   */
                  return animateRows ? (
                    <motion.tr
                      key={rowKeyValue}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      onClick={() => onRowClick?.(row)}
                      className={rowClassName}
                    >
                      {rowContent}
                    </motion.tr>
                  ) : (
                    <tr
                      key={rowKeyValue}
                      onClick={() => onRowClick?.(row)}
                      className={rowClassName}
                    >
                      {rowContent}
                    </tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-[rgb(var(--foreground-muted))]">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, totalItems ?? sortedData.length)}{" "}
            of {totalItems ?? sortedData.length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={cn(
                "rounded-lg border border-[rgb(var(--border))] p-2",
                "transition-colors hover:bg-[rgb(var(--background-secondary))]",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={cn(
                      "h-8 w-8 rounded-lg text-sm transition-colors",
                      pageNum === currentPage
                        ? "bg-[rgb(var(--foreground))] text-[rgb(var(--background))]"
                        : "hover:bg-[rgb(var(--background-secondary))]",
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={cn(
                "rounded-lg border border-[rgb(var(--border))] p-2",
                "transition-colors hover:bg-[rgb(var(--background-secondary))]",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
