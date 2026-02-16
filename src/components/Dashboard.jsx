import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Progress } from "./ui/progress"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts"
import { AlertTriangle, Boxes, Clock3, PackageCheck, Truck } from "lucide-react"

const API_URL = "http://localhost:5000/api"

const fmtHour = (date) => `${date.getHours().toString().padStart(2, "0")}:00`

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function Dashboard() {
  const [orders, setOrders] = useState([])
  const [inventory, setInventory] = useState([])
  const [putawayQueue, setPutawayQueue] = useState([])
  const [dispatchHistory, setDispatchHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [ordersRes, inventoryRes, putawayRes, dispatchRes] = await Promise.all([
        fetch(`${API_URL}/orders`),
        fetch(`${API_URL}/inventory`),
        fetch(`${API_URL}/inventory/putaway-queue`),
        fetch(`${API_URL}/inventory/dispatch-history?limit=500`),
      ])

      if (!ordersRes.ok || !inventoryRes.ok || !putawayRes.ok || !dispatchRes.ok) {
        throw new Error("Failed to load dashboard data")
      }

      const [ordersData, inventoryData, putawayData, dispatchData] = await Promise.all([
        ordersRes.json(),
        inventoryRes.json(),
        putawayRes.json(),
        dispatchRes.json(),
      ])

      setOrders(ordersData)
      setInventory(inventoryData)
      setPutawayQueue(putawayData)
      setDispatchHistory(dispatchData)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const ordersToPick = useMemo(() => {
    return orders.filter((order) => order.type !== "inbound" && ["pending", "processing"].includes(order.status))
  }, [orders])

  const ordersToShipToday = useMemo(() => {
    return orders.filter((order) => {
      if (order.type === "inbound") return false
      if (order.status !== "completed") return false
      const d = new Date(order.updatedAt || order.createdAt)
      return isSameDay(d, now)
    })
  }, [orders, now])

  const openExceptions = useMemo(() => {
    const lowStockCount = inventory.filter((item) => item.status === "low_stock").length
    const receivingAgedCount = inventory.filter((item) => {
      if (item.storageStatus !== "RECEIVED") return false
      const created = new Date(item.createdAt)
      return now.getTime() - created.getTime() > 6 * 60 * 60 * 1000
    }).length
    return lowStockCount + receivingAgedCount
  }, [inventory, now])

  const exceptionItems = useMemo(() => {
    return inventory
      .filter((item) => {
        const isLowStock = item.status === "low_stock"
        const isAgedReceiving =
          item.storageStatus === "RECEIVED" &&
          item.createdAt &&
          now.getTime() - new Date(item.createdAt).getTime() > 6 * 60 * 60 * 1000
        return isLowStock || isAgedReceiving
      })
      .slice(0, 10)
      .map((item) => {
        const reasons = []
        if (item.status === "low_stock") reasons.push("Low Stock")
        if (
          item.storageStatus === "RECEIVED" &&
          item.createdAt &&
          now.getTime() - new Date(item.createdAt).getTime() > 6 * 60 * 60 * 1000
        ) {
          reasons.push("Aged Receiving")
        }
        return {
          id: item.id,
          sku: item.product?.sku || "-",
          name: item.product?.name || "Unknown",
          lp: item.serialNumber || "-",
          location: item.rackLocation || (item.location ? `${item.location.zone}-${item.location.aisle}-${item.location.rack}` : "-"),
          reasons: reasons.join(", "),
        }
      })
  }, [inventory, now])

  const throughputData = useMemo(() => {
    const bins = []
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now)
      d.setMinutes(0, 0, 0)
      d.setHours(d.getHours() - i)
      bins.push({
        key: d.getHours(),
        hour: fmtHour(d),
        received: 0,
        picked: 0,
        shipped: 0,
      })
    }

    const byHour = new Map(bins.map((b) => [b.key, b]))

    orders
      .filter((order) => order.type === "inbound")
      .forEach((order) => {
        const created = new Date(order.createdAt)
        if (!isSameDay(created, now)) return
        const row = byHour.get(created.getHours())
        if (!row) return
        const qty = (order.orderItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0)
        row.received += qty || 1
      })

    orders
      .filter((order) => order.type !== "inbound" && order.status === "completed")
      .forEach((order) => {
        const updated = new Date(order.updatedAt || order.createdAt)
        if (!isSameDay(updated, now)) return
        const row = byHour.get(updated.getHours())
        if (!row) return
        const qty = (order.orderItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0)
        row.picked += qty || 1
      })

    dispatchHistory.forEach((txn) => {
      const created = new Date(txn.createdAt)
      if (!isSameDay(created, now)) return
      const row = byHour.get(created.getHours())
      if (!row) return
      row.shipped += txn.qty || 0
    })

    return bins
  }, [orders, dispatchHistory, now])

  const dockToStockData = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      days.push({ day: dayLabels[d.getDay()], key: d.toDateString(), values: [] })
    }

    const byDay = new Map(days.map((d) => [d.key, d]))

    inventory.forEach((item) => {
      if (item.storageStatus !== "STORED") return
      if (!item.createdAt || !item.updatedAt) return
      const created = new Date(item.createdAt)
      const updated = new Date(item.updatedAt)
      const diffMinutes = Math.max(Math.round((updated.getTime() - created.getTime()) / 60000), 0)
      const bucket = byDay.get(updated.toDateString())
      if (!bucket) return
      bucket.values.push(diffMinutes)
    })

    return days.map((d) => {
      const avg = d.values.length > 0 ? Math.round(d.values.reduce((a, b) => a + b, 0) / d.values.length) : 0
      return { day: d.day, minutes: avg }
    })
  }, [inventory, today])

  const activeTasks = useMemo(() => {
    const candidates = orders
      .filter((order) => order.type !== "inbound" && order.status !== "shipped")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 6)

    return candidates.map((order, index) => {
      const ageMinutes = Math.max(Math.round((now.getTime() - new Date(order.createdAt).getTime()) / 60000), 0)
      const priority = ageMinutes > 180 ? "Critical" : ageMinutes > 90 ? "High" : "Medium"
      const progress = order.status === "completed" ? 90 : order.status === "processing" ? 60 : 20
      const dueIn = ageMinutes > 240 ? "Overdue" : `${Math.max(240 - ageMinutes, 0)}m`

      return {
        id: order.orderNumber,
        zone: order.customer?.name ? `Dest ${order.customer.name}` : `Zone ${String.fromCharCode(65 + (index % 4))}`,
        priority,
        dueIn,
        progress,
      }
    })
  }, [orders, now])

  const replenishmentList = useMemo(() => {
    return inventory
      .filter((item) => {
        const min = item.product?.minStockLevel || 0
        return item.storageStatus === "STORED" && min > 0 && (item.quantity || 0) < min
      })
      .sort((a, b) => (a.quantity || 0) - (b.quantity || 0))
      .slice(0, 6)
      .map((item) => ({
        sku: item.product?.sku || "-",
        location: item.location ? `${item.location.zone}-${item.location.aisle}-${item.location.rack}` : "N/A",
        current: item.quantity || 0,
        min: item.product?.minStockLevel || 1,
      }))
  }, [inventory])

  if (loading) return <div className="p-6">Loading dashboard...</div>
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <div>
        <h1>Warehouse Operations Dashboard</h1>
        <p className="text-muted-foreground">Live status for receiving, inventory, and outbound execution</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Inbound Pending</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{putawayQueue.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting putaway in receiving zone</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Orders To Pick</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{ordersToPick.length}</div>
            <p className="text-xs text-muted-foreground">Outbound orders in pending/processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Orders To Ship Today</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{ordersToShipToday.length}</div>
            <p className="text-xs text-muted-foreground">Completed outbound orders updated today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Open Exceptions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{openExceptions}</div>
            <p className="text-xs text-muted-foreground">Low stock + aged receiving items</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hourly Throughput</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={throughputData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Bar dataKey="received" fill="#2563eb" />
                <Bar dataKey="picked" fill="#ca8a04" />
                <Bar dataKey="shipped" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dock-To-Stock Time (Minutes)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dockToStockData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Line type="monotone" dataKey="minutes" stroke="#7c3aed" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Waves / Task Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active tasks right now.</p>
              ) : (
                activeTasks.map((task) => (
                  <div key={task.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{task.id}</p>
                        <p className="text-sm text-muted-foreground">{task.zone}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={task.priority === "Critical" ? "destructive" : "secondary"}>{task.priority}</Badge>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          Due in {task.dueIn}
                        </p>
                      </div>
                    </div>
                    <Progress value={task.progress} className="h-2" />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Replenishment Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {replenishmentList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No replenishment alerts.</p>
              ) : (
                replenishmentList.map((item) => (
                  <div key={`${item.sku}-${item.location}`} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{item.sku}</span>
                      <span className="text-sm text-muted-foreground">{item.location}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pick Face: {item.current}</span>
                      <span>Min: {item.min}</span>
                    </div>
                    <Progress value={(item.current / item.min) * 100} className="h-2" />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exception Items</CardTitle>
        </CardHeader>
        <CardContent>
          {exceptionItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open exception items.</p>
          ) : (
            <div className="space-y-3">
              {exceptionItems.map((item) => (
                <div key={item.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{item.name}</p>
                    <Badge variant="destructive">{item.reasons}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    SKU: {item.sku} | LP: {item.lp} | Location: {item.location}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
