"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SignInButton,
  SignUpButton,
  SignOutButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/nextjs"
import { BarChart3, BookOpen, Gamepad2, Palette, Rocket, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    title: "Deployments",
    href: "/dashboard/deployments",
    icon: Rocket,
  },
  {
    title: "Branding",
    href: "/dashboard/branding",
    icon: Palette,
  },
  {
    title: "Playground",
    href: "/dashboard/playground",
    icon: Gamepad2, // Using Gamepad2 as a placeholder, maybe find a better icon or reuse
  },
  {
    title: "Docs",
    href: "/docs",
    icon: BookOpen,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const userName = user?.fullName ?? user?.username ?? "Signed in"
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? ""

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 pt-2">
          <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
            <ShieldCheck className="size-4" />
          </div>
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <div className="text-sm font-semibold">PlayProof</div>
            <div className="text-xs text-muted-foreground">Verification Studio</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator className="mt-auto" />
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent transition-colors group-data-[collapsible=icon]:justify-center">
                <span className="text-sm text-sidebar-foreground group-data-[collapsible=icon]:hidden">Theme</span>
                <ThemeToggle />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarFooter>
        <SignedIn>
          <div className="flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-2">
            <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-medium">{userName}</div>
              {userEmail ? (
                <div className="truncate text-xs text-muted-foreground">
                  {userEmail}
                </div>
              ) : null}
            </div>
          </div>
          <SignOutButton>
            <Button variant="ghost" size="sm" className="w-full mt-2 group-data-[collapsible=icon]:hidden">
              Sign Out
            </Button>
          </SignOutButton>
        </SignedIn>
        <SignedOut>
          <div className="flex flex-col gap-2">
            <SignInButton mode="modal">
              <Button variant="outline" size="sm" className="w-full">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm" className="w-full">
                Create account
              </Button>
            </SignUpButton>
          </div>
        </SignedOut>
      </SidebarFooter>
    </Sidebar>
  )
}
