/**
 * CONTEXT:
 * Shadcn-block-based authenticated shell for the DCX user app.
 * It exists to let us test the real sidebar block structure in the app surface
 * with minimal adaptation: our logo, our links, our route label, and our
 * existing account content.
 */
import { type ReactNode } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

type Props = {
  title: string
  currentPathname: string
  userEmail: string | null
  userRole: string | null
  adminHref: string | null
  uxStrings: Record<string, string>
  onNavigateWithinApp: (nextPathname: string) => void
  onLogout: (() => void) | null
  isLogoutPending: boolean
  children: ReactNode
}

export function DcxAppShell(props: Props) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          currentPathname={props.currentPathname}
          userEmail={props.userEmail}
          userRole={props.userRole}
          adminHref={props.adminHref}
          uxStrings={props.uxStrings}
          onNavigateWithinApp={props.onNavigateWithinApp}
          onLogout={props.onLogout}
          isLogoutPending={props.isLogoutPending}
        />
        <SidebarRail />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold tracking-tight text-slate-950">
              {props.title}
            </h1>
          </header>
          <div className="flex flex-1 flex-col gap-4 bg-muted/25 p-4 md:p-6">
            {props.children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
