import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const Combobox = ComboboxPrimitive.Root

const ComboboxInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof ComboboxPrimitive.Input>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Input
    ref={ref}
    className={cn(
      "flex h-12 w-full rounded-none border border-black/8 bg-white px-4 text-sm text-slate-950 shadow-none outline-none placeholder:text-slate-400 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
))
ComboboxInput.displayName = "ComboboxInput"

const ComboboxContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof ComboboxPrimitive.Popup>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Portal>
    <ComboboxPrimitive.Positioner sideOffset={6}>
      <ComboboxPrimitive.Popup
        ref={ref}
        className={cn(
          "z-50 max-h-80 w-[var(--anchor-width)] overflow-hidden rounded-none border border-black/8 bg-white text-slate-950 shadow-lg",
          className,
        )}
        {...props}
      />
    </ComboboxPrimitive.Positioner>
  </ComboboxPrimitive.Portal>
))
ComboboxContent.displayName = "ComboboxContent"

const ComboboxEmpty = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof ComboboxPrimitive.Empty>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Empty
    ref={ref}
    className={cn("px-4 py-3 text-sm text-slate-500", className)}
    {...props}
  />
))
ComboboxEmpty.displayName = "ComboboxEmpty"

const ComboboxList = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof ComboboxPrimitive.List>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.List
    ref={ref}
    className={cn("max-h-80 overflow-y-auto p-1 pb-6 scroll-pb-6", className)}
    {...props}
  />
))
ComboboxList.displayName = "ComboboxList"

const ComboboxCollection = ComboboxPrimitive.Collection
const ComboboxValue = ComboboxPrimitive.Value

const ComboboxGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof ComboboxPrimitive.Group>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Group
    ref={ref}
    className={cn("py-1", className)}
    {...props}
  />
))
ComboboxGroup.displayName = "ComboboxGroup"

const ComboboxGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof ComboboxPrimitive.GroupLabel>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.GroupLabel
    ref={ref}
    className={cn("px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500", className)}
    {...props}
  />
))
ComboboxGroupLabel.displayName = "ComboboxGroupLabel"

const ComboboxItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof ComboboxPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <ComboboxPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default items-center gap-3 rounded-none px-3 py-2.5 text-sm outline-none select-none data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-950 data-[selected]:bg-slate-50",
      className,
    )}
    {...props}
  >
    {children}
    <span className="ml-auto flex size-4 items-center justify-center text-slate-500">
      <ComboboxPrimitive.ItemIndicator>
        <CheckIcon className="size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </span>
  </ComboboxPrimitive.Item>
))
ComboboxItem.displayName = "ComboboxItem"

const ComboboxInputGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof ComboboxPrimitive.InputGroup>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.InputGroup
    ref={ref}
    className={cn(
      "relative flex min-h-12 w-full flex-wrap items-center gap-1 rounded-none border border-black/8 bg-white px-2 py-1 pr-10 text-sm text-slate-950 shadow-none outline-none focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  />
))
ComboboxInputGroup.displayName = "ComboboxInputGroup"

const ComboboxChipsInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof ComboboxPrimitive.Input>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Input
    ref={ref}
    className={cn(
      "min-h-7 min-w-28 flex-1 bg-transparent px-1 text-sm text-slate-950 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed",
      className,
    )}
    {...props}
  />
))
ComboboxChipsInput.displayName = "ComboboxChipsInput"

const ComboboxChips = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof ComboboxPrimitive.Chips>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Chips
    ref={ref}
    className={cn("contents", className)}
    {...props}
  />
))
ComboboxChips.displayName = "ComboboxChips"

const ComboboxChip = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof ComboboxPrimitive.Chip>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Chip
    ref={ref}
    className={cn(
      "inline-flex h-7 max-w-full items-center gap-0.5 rounded-md bg-slate-100 px-2 text-xs font-medium text-slate-800 outline-none data-[highlighted]:ring-2 data-[highlighted]:ring-sky-300",
      className,
    )}
    {...props}
  />
))
ComboboxChip.displayName = "ComboboxChip"

const ComboboxChipRemove = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof ComboboxPrimitive.ChipRemove>
>(({ className, children, ...props }, ref) => (
  <ComboboxPrimitive.ChipRemove
    ref={ref}
    className={cn(
      "inline-flex size-5 items-center justify-center rounded-sm text-slate-500 transition-colors hover:bg-red-100 hover:text-red-700 focus-visible:bg-red-100 focus-visible:text-red-700 focus-visible:outline-none",
      className,
    )}
    title="Remove"
    {...props}
  >
    {children ?? <XIcon className="size-3" />}
  </ComboboxPrimitive.ChipRemove>
))
ComboboxChipRemove.displayName = "ComboboxChipRemove"

function ComboboxTriggerIcon(props: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-slate-400", props.className)}
    >
      <ChevronDownIcon className="size-4" />
    </span>
  )
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChipsInput,
  ComboboxChips,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTriggerIcon,
  ComboboxValue,
}
