"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  BadgeCheckIcon,
  BarChart3Icon,
  ChevronsUpDownIcon,
  CreditCardIcon,
  LogOutIcon,
  ScrollTextIcon,
  Settings2Icon,
  ShieldCheckIcon,
  ShieldUserIcon,
} from "lucide-react"

export function NavUser({
  user,
  uxStrings,
  adminHref,
  onNavigateWithinApp,
  onLogout,
  isLogoutPending,
}: {
  user: {
    name: string
    email: string
  }
  uxStrings: Record<string, string>
  adminHref: string | null
  onNavigateWithinApp: (nextPathname: string) => void
  onLogout: (() => void) | null
  isLogoutPending: boolean
}) {
  const { isMobile } = useSidebar()
  const fallbackLabel = user.email.slice(0, 1).toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  {fallbackLabel}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    {fallbackLabel}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a
                href="/me/account"
                onClick={(event) => {
                  event.preventDefault()
                  onNavigateWithinApp("/me/account")
                }}
              >
                <BadgeCheckIcon />
                {uxStrings.user_menu_account}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <CreditCardIcon />
              {uxStrings.user_menu_subscription}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href="/me/usage"
                onClick={(event) => {
                  event.preventDefault()
                  onNavigateWithinApp("/me/usage")
                }}
              >
                <BarChart3Icon />
                {uxStrings.user_menu_usage ?? "Usage"}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href="/me/settings"
                onClick={(event) => {
                  event.preventDefault()
                  onNavigateWithinApp("/me/settings")
                }}
              >
                <Settings2Icon />
                {uxStrings.user_menu_settings}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <ShieldCheckIcon />
              {uxStrings.user_menu_privacy_security}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href="/me/activity-log"
                onClick={(event) => {
                  event.preventDefault()
                  onNavigateWithinApp("/me/activity-log")
                }}
              >
                <ScrollTextIcon />
                {uxStrings.user_menu_activity_log}
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {adminHref ? (
              <DropdownMenuItem asChild>
                <a href={adminHref}>
                  <ShieldUserIcon />
                  {uxStrings.nav_admin_workspace ?? "Admin workspace"}
                </a>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              disabled={!onLogout || isLogoutPending}
              onSelect={(event) => {
                event.preventDefault()
                onLogout?.()
              }}
            >
              <LogOutIcon />
              {isLogoutPending ? uxStrings.user_menu_log_out_pending : uxStrings.user_menu_log_out}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
