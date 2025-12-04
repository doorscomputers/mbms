"use client"

import {
  Bus,
  Calendar,
  ChevronDown,
  Fuel,
  Home,
  Settings,
  Users,
  Wrench,
  FileText,
  Package,
  UserCog,
  CreditCard,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
  },
]

export function AppSidebar() {
  const pathname = usePathname()

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
              {menuItems.map((item) =>
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
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          <span>Version 1.0.0</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
