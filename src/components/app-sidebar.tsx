"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  BotIcon,
  InboxIcon,
  ShieldUserIcon,
  MessageCircleMoreIcon,
  SendHorizontalIcon,
  StoreIcon,
} from "lucide-react"
import dcxLogo from "@/assets/dcx_logo.png"
import { readDcxAppAuthenticatedUserAccountSummary } from "@/lib/read_dcx_app_authenticated_user_account_summary"

type Props = React.ComponentProps<typeof Sidebar> & {
  apiBaseUrl: string
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
  apiBaseUrl,
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
  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () =>
      readDcxAppAuthenticatedUserAccountSummary({
        apiBaseUrl,
      }),
  })
  const accountSummary = accountSummaryQuery.data?.data ?? null
  const navMain = [
    {
      id: "new",
      title: uxStrings.nav_new ?? "New",
      url: "/new",
      icon: <SendHorizontalIcon />,
      isActive: currentPathname.startsWith("/new"),
    },
    {
      id: "my_trades",
      title: uxStrings.nav_my_trades_section ?? "My Trades",
      url: "#",
      icon: <StoreIcon />,
      isActive:
        currentPathname.startsWith("/trades/board") ||
        currentPathname.startsWith("/trades/chats") ||
        currentPathname.startsWith("/trades/objects"),
      items: [
        {
          title: uxStrings.nav_trade_board ?? "Trade Board",
          url: "/trades/board",
          isActive: currentPathname.startsWith("/trades/board"),
        },
        {
          title: uxStrings.nav_trade_chats ?? "Trade Chats",
          url: "/trades/chats",
          isActive: currentPathname.startsWith("/trades/chats"),
        },
        {
          title: uxStrings.nav_trade_objects ?? "Trade Objects",
          url: "/trades/objects",
          isActive: currentPathname.startsWith("/trades/objects"),
        },
      ],
    },
    {
      id: "my_network",
      title: uxStrings.nav_my_network ?? "My Network",
      url: "#",
      icon: <MessageCircleMoreIcon />,
      isActive: currentPathname.startsWith("/network/"),
      items: [
        {
          title: uxStrings.nav_network_feed ?? "Feed",
          url: "/network/feed",
          isActive: currentPathname.startsWith("/network/feed"),
        },
        {
          title: uxStrings.nav_network_bookmarks ?? "Bookmarks",
          url: "/network/bookmarks",
          isActive: currentPathname.startsWith("/network/bookmarks"),
        },
        {
          title: uxStrings.nav_network_contacts ?? "Contacts",
          url: "/network/contacts",
          isActive: currentPathname.startsWith("/network/contacts"),
        },
        {
          title: uxStrings.nav_dms ?? "DMs",
          url: "/network/dms",
          isActive: currentPathname.startsWith("/network/dms"),
        },
      ],
    },
    {
      id: "my_ai",
      title: uxStrings.nav_my_ai ?? "My AI",
      url: "#",
      icon: <BotIcon />,
      isActive: currentPathname.startsWith("/ai/chats"),
      items: [
        {
          title: uxStrings.nav_ai_chats ?? "AI Chats",
          url: "/ai/chats",
          isActive: currentPathname.startsWith("/ai/chats"),
        },
      ],
    },
    {
      id: "my_admin",
      title: uxStrings.nav_my_admin ?? "My Admin",
      url: "#",
      icon: <InboxIcon />,
      isActive:
        currentPathname.startsWith("/me/messages"),
      items: [
        {
          title: uxStrings.nav_messages_inbox ?? "Messages Inbox",
          url: "/me/messages",
          isActive: currentPathname.startsWith("/me/messages"),
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
        <DcxAppSidebarTradingClocks
          preferredTimezone={accountSummary?.preferred_timezone ?? null}
          sidebarClockTimezones={accountSummary?.selected_sidebar_clock_timezones ?? []}
        />
        <NavMain
          items={navMain}
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

type DcxSidebarClockTimezone = {
  id: number
  iana_name: string
  display_label: string
  region_label: string
}

function DcxAppSidebarTradingClocks(props: {
  preferredTimezone: DcxSidebarClockTimezone | null
  sidebarClockTimezones: DcxSidebarClockTimezone[]
}) {
  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  const clockTimezones = readDcxSidebarClockTimezones({
    preferredTimezone: props.preferredTimezone,
    sidebarClockTimezones: props.sidebarClockTimezones,
  })

  if (clockTimezones.length === 0) {
    return null
  }

  return (
    <SidebarGroup className="pt-2 group-data-[collapsible=icon]:hidden">
      <SidebarGroupContent>
        <div className="grid grid-cols-3 gap-1 px-1.5 pb-2 pt-1">
          {clockTimezones.map((timezone) => (
            <div
              key={`${timezone.kind}:${timezone.id}`}
              className="flex justify-center text-center"
            >
              <DcxAppSidebarTradingClock
                timezone={timezone}
                now={now}
                variant="row"
              />
            </div>
          ))}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function DcxAppSidebarTradingClock(props: {
  timezone: DcxSidebarClockTimezone & { kind: "preferred" | "selected" }
  now: Date
  variant?: "default" | "row"
}) {
  const timeParts = readDcxSidebarClockTimeParts(props.timezone.iana_name, props.now)
  const hourAngle = ((timeParts.hour % 12) + timeParts.minute / 60 + timeParts.second / 3600) * 30
  const minuteAngle = (timeParts.minute + timeParts.second / 60) * 6
  const secondAngle = timeParts.second * 6
  const isRow = props.variant === "row"
  const clockSizeClassName = isRow ? "size-[4.35rem]" : "size-[5.15rem]"
  const clockNumerals = Array.from({ length: 12 }, (_, numeralIndex) => numeralIndex + 1)
  const isNightTime = readDcxSidebarClockIsNightTime(timeParts.hour)
  const faceFillClassName = isNightTime ? "fill-[#3a5b7f]" : "fill-white"
  const numeralClassName = isNightTime ? "fill-white text-[8.5px] font-semibold" : "fill-slate-500 text-[8.5px] font-semibold"
  const tickClassName = isNightTime ? "stroke-white/65" : "stroke-slate-300"
  const hourHandClassName = isNightTime ? "stroke-white" : "stroke-[#314f70]"
  const minuteHandClassName = isNightTime ? "stroke-white" : "stroke-[#3a5b7f]"
  const centerPinClassName = isNightTime ? "fill-white" : "fill-slate-400"

  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={`${readDcxSidebarClockLabel(props.timezone)} local time`}
        className={clockSizeClassName}
      >
        <circle cx="50" cy="50" r="48" className={`${faceFillClassName} stroke-slate-100`} strokeWidth="1" />
        <circle
          cx="50"
          cy="50"
          r="47"
          className={isNightTime ? "fill-transparent stroke-white/20" : "fill-transparent stroke-slate-200"}
          strokeWidth="1.2"
        />
        {clockNumerals.map((numeral) => {
          const numeralCoordinates = readDcxSidebarClockHandCoordinates(numeral * 30, 36)
          return (
            <text
              key={numeral}
              x={numeralCoordinates.x}
              y={numeralCoordinates.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className={isRow ? numeralClassName : numeralClassName.replace("8.5px", "9px")}
            >
              {numeral}
            </text>
          )
        })}
        {Array.from({ length: 60 }).map((_, tickIndex) => {
          if (tickIndex % 5 !== 0) {
            return null
          }
          const tickAngle = tickIndex * 6
          const tickStart = readDcxSidebarClockHandCoordinates(tickAngle, 42)
          const tickEnd = readDcxSidebarClockHandCoordinates(tickAngle, 44)
          return (
            <line
              key={tickIndex}
              x1={tickStart.x}
              y1={tickStart.y}
              x2={tickEnd.x}
              y2={tickEnd.y}
              className={tickClassName}
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          )
        })}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="32"
          className={hourHandClassName}
        strokeWidth="5"
        strokeLinecap="round"
        transform={`rotate(${hourAngle} 50 50)`}
      />
      <line
        x1="50"
        y1="50"
          x2="50"
          y2="17"
          className={minuteHandClassName}
        strokeWidth="3"
        strokeLinecap="round"
        transform={`rotate(${minuteAngle} 50 50)`}
      />
      <line
        x1="50"
        y1="50"
          x2="50"
          y2="14"
        className="stroke-[#f08a24]"
        strokeWidth="1.5"
        strokeLinecap="round"
        transform={`rotate(${secondAngle} 50 50)`}
      />
        <circle cx="50" cy="50" r="3.5" className={centerPinClassName} />
      </svg>
      <span className={isRow ? "max-w-[4.35rem] truncate text-[0.66rem] font-semibold leading-none text-sidebar-foreground" : "max-w-20 truncate text-[0.68rem] font-semibold leading-none text-sidebar-foreground"}>
        {readDcxSidebarClockLabel(props.timezone)}
      </span>
    </div>
  )
}

function readDcxSidebarClockTimezones(params: {
  preferredTimezone: DcxSidebarClockTimezone | null
  sidebarClockTimezones: DcxSidebarClockTimezone[]
}): Array<DcxSidebarClockTimezone & { kind: "preferred" | "selected" }> {
  const seenTimezoneIds = new Set<number>()
  const clockTimezones: Array<DcxSidebarClockTimezone & { kind: "preferred" | "selected" }> = []
  if (params.preferredTimezone) {
    clockTimezones.push({
      ...params.preferredTimezone,
      kind: "preferred",
    })
    seenTimezoneIds.add(params.preferredTimezone.id)
  }

  for (const timezone of params.sidebarClockTimezones) {
    if (seenTimezoneIds.has(timezone.id)) {
      continue
    }
    clockTimezones.push({
      ...timezone,
      kind: "selected",
    })
    seenTimezoneIds.add(timezone.id)
  }

  return clockTimezones.slice(0, 3)
}

function readDcxSidebarClockIsNightTime(hour: number): boolean {
  return hour >= 22 || hour < 6
}

function readDcxSidebarClockTimeParts(ianaName: string, now: Date): {
  hour: number
  minute: number
  second: number
} {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: ianaName,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0")
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0")
  const second = Number(parts.find((part) => part.type === "second")?.value ?? "0")

  return {
    hour,
    minute,
    second,
  }
}

function readDcxSidebarClockHandCoordinates(angleDegrees: number, length: number): {
  x: number
  y: number
} {
  const angleRadians = (angleDegrees * Math.PI) / 180
  return {
    x: 50 + Math.sin(angleRadians) * length,
    y: 50 - Math.cos(angleRadians) * length,
  }
}

function readDcxSidebarClockLabel(timezone: DcxSidebarClockTimezone): string {
  const withoutUtcPrefix = timezone.display_label.replace(/^\(UTC[^)]*\)\s*/, "").trim()
  if (withoutUtcPrefix) {
    return withoutUtcPrefix
  }
  return timezone.iana_name.split("/").at(-1)?.replace(/_/g, " ") ?? timezone.iana_name
}
