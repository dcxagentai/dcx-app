/**
 * CONTEXT:
 * This file provides one lightweight TanStack-plus-shadcn table shell for the DCX app surface.
 * It exists so compact user-facing lists can share the same visual table family as admin
 * without inheriting heavier catalog controls such as filters, column toggles, or pagination footers.
 */
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"

import { cn } from "@/lib/utils"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table"

type Props<TData> = {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  emptyLabel: string
  tableClassName?: string
  readColumnWidthClassName?: (columnId: string) => string
}

export function DcxAppDataTable<TData>(props: Props<TData>) {
  const table = useReactTable({
    data: props.data,
    columns: props.columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Table className={cn("min-w-full table-fixed border-collapse", props.tableClassName)}>
      <TableHeader className="bg-slate-50/80">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                className={cn(props.readColumnWidthClassName?.(header.column.id))}
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
              className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn(
                    "text-sm text-slate-900",
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
  )
}
