"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, RefreshCw, Shield, User, MapPin } from "lucide-react"
import { formatDate } from "@/lib/types"
import { useIsMobile } from "@/hooks/use-mobile"

interface UserData {
  id: string
  username: string
  name: string
  role: string
  operatorId: string | null
  operator: { id: string; name: string } | null
  routeId: string | null
  route: { id: string; name: string } | null
  isActive: boolean
  createdAt: string
}

interface Operator {
  id: string
  name: string
}

interface Route {
  id: string
  name: string
}

export default function UsersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<UserData[]>([])
  const [operators, setOperators] = useState<Operator[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const isMobile = useIsMobile()

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    role: "OPERATOR",
    operatorId: "",
    routeId: "",
  })

  // Check if user is SUPER_ADMIN
  useEffect(() => {
    if (session && session.user?.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
    }
  }, [session, router])

  const fetchData = async () => {
    try {
      const [usersRes, operatorsRes, routesRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/operators"),
        fetch("/api/routes"),
      ])
      const usersData = await usersRes.json()
      const operatorsData = await operatorsRes.json()
      const routesData = await routesRes.json()

      if (usersData.success) setUsers(usersData.data)
      if (operatorsData.success) setOperators(operatorsData.data)
      if (routesData.success) setRoutes(routesData.data)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          operatorId: formData.role === "OPERATOR" ? (formData.operatorId || null) : null,
          routeId: formData.role === "ROUTE_ADMIN" ? (formData.routeId || null) : null,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success("User created successfully")
        setDialogOpen(false)
        setFormData({
          username: "",
          password: "",
          name: "",
          role: "OPERATOR",
          operatorId: "",
          routeId: "",
        })
        fetchData()
      } else {
        toast.error(data.error || "Failed to create user")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setSaving(false)
    }
  }

  if (session?.user?.role !== "SUPER_ADMIN") {
    return null
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="User Accounts" />
        <div className="flex-1 p-4 md:p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title="User Accounts" />
      <div className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Manage Users</CardTitle>
              <CardDescription>
                Create and manage user accounts for operators
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account for an operator
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      placeholder="e.g. john or ABC Company"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) =>
                        setFormData({ ...formData, role: value, operatorId: "", routeId: "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                        <SelectItem value="ROUTE_ADMIN">Route Admin</SelectItem>
                        <SelectItem value="OPERATOR">Operator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.role === "ROUTE_ADMIN" && (
                    <div className="space-y-2">
                      <Label htmlFor="route">Assign to Route</Label>
                      <Select
                        value={formData.routeId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, routeId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select route" />
                        </SelectTrigger>
                        <SelectContent>
                          {routes.map((route) => (
                            <SelectItem key={route.id} value={route.id}>
                              {route.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Route Admin will only manage this route&apos;s data
                      </p>
                    </div>
                  )}
                  {formData.role === "OPERATOR" && (
                    <div className="space-y-2">
                      <Label htmlFor="operator">Link to Operator</Label>
                      <Select
                        value={formData.operatorId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, operatorId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select operator" />
                        </SelectTrigger>
                        <SelectContent>
                          {operators
                            .filter(
                              (op) =>
                                !users.some((u) => u.operatorId === op.id)
                            )
                            .map((operator) => (
                              <SelectItem key={operator.id} value={operator.id}>
                                {operator.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Only operators without accounts are shown
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Creating..." : "Create User"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              // Mobile Card View
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${user.role === "SUPER_ADMIN" ? "bg-primary/10" : user.role === "ROUTE_ADMIN" ? "bg-blue-100" : "bg-muted"}`}>
                          {user.role === "SUPER_ADMIN" ? (
                            <Shield className="h-5 w-5 text-primary" />
                          ) : user.role === "ROUTE_ADMIN" ? (
                            <MapPin className="h-5 w-5 text-blue-600" />
                          ) : (
                            <User className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold">{user.name}</div>
                          <div className="text-sm text-muted-foreground">@{user.username}</div>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          user.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Role:</span>
                        <span className={`ml-1 font-medium ${user.role === "SUPER_ADMIN" ? "text-primary" : user.role === "ROUTE_ADMIN" ? "text-blue-600" : ""}`}>
                          {user.role === "SUPER_ADMIN" ? "Super Admin" : user.role === "ROUTE_ADMIN" ? "Route Admin" : "Operator"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <span className="ml-1 font-medium">{formatDate(user.createdAt)}</span>
                      </div>
                      {user.route && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Route:</span>
                          <span className="ml-1 font-medium">{user.route.name}</span>
                        </div>
                      )}
                      {user.operator && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Operator:</span>
                          <span className="ml-1 font-medium">{user.operator.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="p-4 text-center text-muted-foreground">
                    No users found
                  </div>
                )}
              </div>
            ) : (
              // Desktop Table View
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Route / Operator</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {user.role === "SUPER_ADMIN" ? (
                            <Shield className="h-4 w-4 text-primary" />
                          ) : user.role === "ROUTE_ADMIN" ? (
                            <MapPin className="h-4 w-4 text-blue-600" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                          {user.name}
                        </div>
                      </TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            user.role === "SUPER_ADMIN"
                              ? "bg-primary/10 text-primary"
                              : user.role === "ROUTE_ADMIN"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {user.role === "SUPER_ADMIN" ? "Super Admin" : user.role === "ROUTE_ADMIN" ? "Route Admin" : "Operator"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.route?.name || user.operator?.name || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            user.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-8"
                      >
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
