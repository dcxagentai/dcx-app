"use client"

import { useEffect, useState } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"

const DCX_APP_NAV_MAIN_OPEN_STATE_STORAGE_KEY = "dcx_app_nav_main_open_state_v1"

type NavMainItem = {
  id: string
  title: string
  url: string
  icon: React.ReactNode
  isActive?: boolean
  isDisabled?: boolean
  badge?: string
  items?: {
    title: string
    url: string
    isActive?: boolean
    isDisabled?: boolean
  }[]
}

export function NavMain(props: {
  items: NavMainItem[]
  groupLabel: string
  toggleSectionLabel: string
}) {
  const [openStateById, setOpenStateById] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") {
      return Object.fromEntries(props.items.map((item) => [item.id, Boolean(item.isActive)]))
    }

    try {
      const storedValue = window.localStorage.getItem(DCX_APP_NAV_MAIN_OPEN_STATE_STORAGE_KEY)
      if (!storedValue) {
        return Object.fromEntries(props.items.map((item) => [item.id, Boolean(item.isActive)]))
      }

      const parsedValue = JSON.parse(storedValue) as Record<string, boolean>
      return Object.fromEntries(
        props.items.map((item) => [item.id, parsedValue[item.id] ?? Boolean(item.isActive)]),
      )
    } catch {
      return Object.fromEntries(props.items.map((item) => [item.id, Boolean(item.isActive)]))
    }
  })

  useEffect(() => {
    window.localStorage.setItem(
      DCX_APP_NAV_MAIN_OPEN_STATE_STORAGE_KEY,
      JSON.stringify(openStateById),
    )
  }, [openStateById])

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{props.groupLabel}</SidebarGroupLabel>
      <SidebarMenu>
        {props.items.map((item) => {
          if (!item.items?.length) {
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={item.isActive}
                  className={item.isDisabled ? "opacity-70" : undefined}
                >
                  <a
                    href={item.url}
                    aria-disabled={item.isDisabled ? "true" : undefined}
                    className={item.isDisabled ? "pointer-events-none" : undefined}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
                {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
              </SidebarMenuItem>
            )
          }

          return (
            <Collapsible
              key={item.id}
              asChild
              open={openStateById[item.id] ?? Boolean(item.isActive)}
              onOpenChange={(nextOpenState) => {
                setOpenStateById((previousState) => ({
                  ...previousState,
                  [item.id]: nextOpenState,
                }))
              }}
            >
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={item.isActive}
                  className={item.isDisabled ? "opacity-70" : undefined}
                >
                  <a
                    href={item.url}
                    aria-disabled={item.isDisabled ? "true" : undefined}
                    className={item.isDisabled ? "pointer-events-none" : undefined}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
                <CollapsibleTrigger asChild>
                  <SidebarMenuAction className="data-[state=open]:rotate-90">
                    <ChevronRightIcon />
                    <span className="sr-only">{props.toggleSectionLabel}</span>
                  </SidebarMenuAction>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={subItem.isActive}
                          className={subItem.isDisabled ? "opacity-60" : undefined}
                        >
                          <a
                            href={subItem.url}
                            aria-disabled={subItem.isDisabled ? "true" : undefined}
                            className={subItem.isDisabled ? "pointer-events-none" : undefined}
                          >
                            <span>{subItem.title}</span>
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
                {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
