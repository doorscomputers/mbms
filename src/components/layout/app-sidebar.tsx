"use client"

import {
  Bus,
  Calendar,
  ChevronDown,
  Home,
  Settings,
  Users,
  Wrench,
  FileText,
  UserCog,
  CreditCard,
  LogOut,
  Shield,
  UserCircle,
  MapPin,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"

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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"

const menuItems = [
  {
    title: "Dashboard",
    icon: Home,
    href: "/dashboard",
  },
  {
    title: "Daily Records",
    icon: Calendar,
    href: "/dashboard/daily-records",
    subItems: [
      { title: "Collections", href: "/dashboard/daily-records" },
      { title: "Add New Record", href: "/dashboard/daily-records/new" },
    ],
  },
  {
    title: "Maintenance",
    icon: Wrench,
    href: "/dashboard/maintenance",
    subItems: [
      { title: "All Records", href: "/dashboard/maintenance" },
      { title: "Add Service", href: "/dashboard/maintenance/new" },
      { title: "Spare Parts", href: "/dashboard/spare-parts" },
    ],
  },
  {
    title: "Buses",
    icon: Bus,
    href: "/dashboard/buses",
  },
  {
    title: "Drivers",
    icon: Users,
    href: "/dashboard/drivers",
  },
  {
    title: "Operators",
    icon: UserCog,
    href: "/dashboard/operators",
    adminOnly: true,
  },
  {
    title: "Routes",
    icon: MapPin,
    href: "/dashboard/routes",
    superAdminOnly: true,
  },
  {
    title: "User Accounts",
    icon: Shield,
    href: "/dashboard/users",
    superAdminOnly: true,
  },
  {
    title: "Accounts Payable",
    icon: CreditCard,
    href: "/dashboard/accounts-payable",
  },
  {
    title: "Reports",
    icon: FileText,
    href: "/dashboard/reports",
    subItems: [
      { title: "Summary", href: "/dashboard/reports" },
      { title: "Fleet Analytics", href: "/dashboard/reports/analytics" },
      { title: "Anomaly Detection", href: "/dashboard/reports/anomaly" },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
    superAdminOnly: true,
  },
  {
    title: "Route Settings",
    icon: Settings,
    href: "/dashboard/settings/route",
    routeAdminOnly: true,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"
  const isRouteAdmin = session?.user?.role === "ROUTE_ADMIN"
  const isAdmin = isSuperAdmin || isRouteAdmin

  // Filter menu items based on role
  const filteredMenuItems = menuItems.filter(item => {
    if ('superAdminOnly' in item && item.superAdminOnly && !isSuperAdmin) return false
    if ('routeAdminOnly' in item && item.routeAdminOnly && !isRouteAdmin) return false
    if ('adminOnly' in item && item.adminOnly && !isAdmin) return false
    return true
  })

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Bus className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">MBMS</h1>
            <p className="text-xs text-muted-foreground">Mini Bus Management</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) =>
                item.subItems ? (
                  <Collapsible key={item.title} defaultOpen={pathname.startsWith(item.href)}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          isActive={pathname.startsWith(item.href)}
                          className="justify-between"
                        >
                          <span className="flex items-center gap-3">
                            <item.icon className="h-4 w-4" />
                            {item.title}
                          </span>
                          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.href}
                              >
                                <Link href={subItem.href}>{subItem.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-4">
        {session?.user && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-medium text-primary">
                  {session.user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{session.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {session.user.operatorName || session.user.role}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                asChild
              >
                <Link href="/dashboard/profile">
                  <UserCircle className="h-4 w-4 mr-2" />
                  My Profile
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
