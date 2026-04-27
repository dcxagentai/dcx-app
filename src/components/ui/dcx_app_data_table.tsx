/**
 * CONTEXT:
 * This file provides one lightweight TanStack-plus-shadcn table shell for the DCX app surface.
 * It exists so compact user-facing lists can share the same visual table family as admin
 * without inheriting heavier catalog controls such as filters, column toggles, or pagination footers.
 */
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
} from "@tanstack/react-table"

import { cn } from "@/lib/utils"

import { Button } from "./button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table"

type Props<TData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  emptyLabel: string
  tableClassName?: string
  readColumnWidthClassName?: (columnId: string) => string
  readRowClassName?: (rowData: TData, rowIndex: number) => string
  onRowClick?: (rowData: TData) => void
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  pageSize?: number
}

export function DcxAppDataTable<TData>(props: Props<TData>) {
  const table = useReactTable({
    data: props.data,
    columns: props.columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: props.onSortingChange,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: props.pageSize ?? 25,
      },
    },
    state: {
      sorting: props.sorting,
    },
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalRowCount = props.data.length
  const pageRowCount = table.getRowModel().rows.length
  const visibleRowStart = totalRowCount === 0 ? 0 : pageIndex * pageSize + 1
  const visibleRowEnd = totalRowCount === 0 ? 0 : pageIndex * pageSize + pageRowCount

  return (
    <div className="space-y-3">
      <Table className={cn("min-w-full table-fixed border-collapse", props.tableClassName)}>
        <TableHeader className="bg-slate-50/80">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "overflow-hidden text-ellipsis whitespace-nowrap",
                    props.readColumnWidthClassName?.(header.column.id),
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row, rowIndex) => (
              <TableRow
                key={row.id}
                className={cn(
                  rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/40",
                  props.onRowClick && "cursor-pointer hover:bg-slate-100/70",
                  props.readRowClassName?.(row.original, rowIndex),
                )}
                onClick={() => props.onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "overflow-hidden text-ellipsis whitespace-nowrap text-sm text-slate-900",
                      props.readColumnWidthClassName?.(cell.column.id),
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="bg-white">
              <TableCell
                colSpan={props.columns.length}
                className="text-sm text-slate-500"
              >
                {props.emptyLabel}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {totalRowCount > 0 ? (
        <div className="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Showing {visibleRowStart}-{visibleRowEnd} of {totalRowCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
