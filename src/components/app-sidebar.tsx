"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  ContactRoundIcon,
  FolderIcon,
  LandmarkIcon,
  ShieldUserIcon,
  MessageCircleMoreIcon,
} from "lucide-react"
import dcxLogo from "@/assets/dcx_logo.png"

type Props = React.ComponentProps<typeof Sidebar> & {
  currentPathname: string
  userEmail: string | null
  userRole: string | null
  adminHref: string | null
  uxStrings: Record<string, string>
  onNavigateWithinApp: (nextPathname: string) => void
  onLogout: (() => void) | null
  isLogoutPending: boolean
}

export function AppSidebar({
  currentPathname,
  userEmail,
  userRole,
  adminHref,
  uxStrings,
  onNavigateWithinApp,
  onLogout,
  isLogoutPending,
  ...props
}: Props) {
  const navMain = [
    {
      id: "chats",
      title: uxStrings.nav_chats,
      url: "#",
      icon: <MessageCircleMoreIcon />,
      isDisabled: true,
      items: [
        {
          title: uxStrings.nav_chats_inbox,
          url: "#",
          isDisabled: true,
        },
        {
          title: uxStrings.nav_chats_humans,
          url: "#",
          isDisabled: true,
        },
        {
          title: uxStrings.nav_chats_agents,
          url: "#",
          isDisabled: true,
        },
      ],
    },
    {
      id: "trades",
      title: uxStrings.nav_trades,
      url: "#",
      icon: <LandmarkIcon />,
      isDisabled: true,
      items: [
        {
          title: uxStrings.nav_trades_market_watch,
          url: "#",
          isDisabled: true,
        },
        {
          title: uxStrings.nav_trades_my_trades,
          url: "#",
          isDisabled: true,
        },
      ],
    },
    {
      id: "contacts",
      title: uxStrings.nav_contacts,
      url: "#",
      icon: <ContactRoundIcon />,
      isDisabled: true,
      badge: uxStrings.nav_badge_soon,
    },
    {
      id: "files",
      title: uxStrings.nav_files,
      url: "#",
      icon: <FolderIcon />,
      isDisabled: true,
      items: [
        {
          title: uxStrings.nav_files_documents,
          url: "#",
          isDisabled: true,
        },
        {
          title: uxStrings.nav_files_images,
          url: "#",
          isDisabled: true,
        },
        {
          title: uxStrings.nav_files_audio,
          url: "#",
          isDisabled: true,
        },
      ],
    },
  ]

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a
                href="/me/account"
                onClick={(event) => {
                  event.preventDefault()
                  onNavigateWithinApp("/me/account")
                }}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#fbfaf7] ring-1 ring-sidebar-border">
                  <img src={dcxLogo} alt="DCX logo" className="size-6 object-contain" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{uxStrings.surface_label}</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={navMain}
          groupLabel={uxStrings.nav_group_workspace}
          toggleSectionLabel={uxStrings.nav_toggle_section}
        />
      </SidebarContent>
      <SidebarFooter>
        {adminHref ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={uxStrings.nav_admin_workspace}>
                <a href={adminHref}>
                  <ShieldUserIcon />
                  <span>{uxStrings.nav_admin_workspace}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}
        <NavUser
          user={{
            name: userRole ?? "user",
            email: userEmail ?? "DCX user",
          }}
          uxStrings={uxStrings}
          onNavigateWithinApp={onNavigateWithinApp}
          onLogout={onLogout}
          isLogoutPending={isLogoutPending}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
