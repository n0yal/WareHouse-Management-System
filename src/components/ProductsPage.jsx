import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Label } from "./ui/label"
import { Filter, Search, Boxes, ArrowRightLeft, ShieldAlert, History, Pencil, Trash2 } from "lucide-react"
import { HazardBadge } from "./HazardBadge"

const API_URL = "http://localhost:5000/api"
const formatReceivedAt = (value) => (value ? new Date(value).toLocaleString() : "-")

export function ProductsPage({ role = "admin" }) {
  const [inventory, setInventory] = useState([])
  const [locations, setLocations] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedRow, setSelectedRow] = useState(null)
  const [adjustQty, setAdjustQty] = useState("0")
  const [transferLocationId, setTransferLocationId] = useState("")
  const [holdRows, setHoldRows] = useState(new Set())
  const [historyByBalanceKey, setHistoryByBalanceKey] = useState({})
  const [deletingId, setDeletingId] = useState("")

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [inventoryRes, locationsRes] = await Promise.all([
        fetch(`${API_URL}/inventory`),
        fetch(`${API_URL}/locations`),
      ])

      if (!inventoryRes.ok || !locationsRes.ok) {
        throw new Error("Failed to load inventory data")
      }

      const [inventoryData, locationsData] = await Promise.all([inventoryRes.json(), locationsRes.json()])
      setInventory(inventoryData)
      setLocations(locationsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const rows = useMemo(() => {
    return inventory
      .filter((item) => (item.onHandQty || item.quantity || 0) > 0)
      .map((item) => {
        const onHand = item.onHandQty ?? item.quantity ?? 0
        const allocated = item.allocatedQty ?? 0
        const hold = holdRows.has(item.id) ? onHand : item.holdQty ?? 0
        const damaged = item.damagedQty ?? 0
        const available = Math.max(onHand - allocated - hold - damaged, 0)
        const status = hold > 0 ? "hold" : available <= 0 ? "expired" : allocated > 0 ? "allocated" : "available"

        return {
          id: item.id,
          productId: item.productId,
          sku: item.product?.sku || "-",
          name: item.product?.name || "Unknown",
          ean: item.product?.ean || item.product?.sku || "-",
          onHand,
          allocated,
          available,
          hold,
          damaged,
          primaryBin: item.rackLocation || (item.location ? `${item.location.zone}-${item.location.aisle}-${item.location.rack}` : "UNASSIGNED"),
          locationId: item.locationId,
          classification: item.classification || "NORMAL",
          receivedAt: item.createdAt || null,
          status,
          storageStatus: item.storageStatus || "STORED",
          lotNumber: item.lotNumber || "-",
          serialNumber: item.serialNumber || "-",
        }
      })
  }, [inventory, holdRows])

  const filteredRows = rows.filter((row) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      row.name.toLowerCase().includes(q) ||
      row.sku.toLowerCase().includes(q) ||
      row.ean.toLowerCase().includes(q) ||
      row.serialNumber.toLowerCase().includes(q)
    const matchesStatus = statusFilter === "all" || row.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const addHistory = (balanceId, entry) => {
    setHistoryByBalanceKey((prev) => ({
      ...prev,
      [balanceId]: [
        { id: crypto.randomUUID(), action: entry.action, detail: entry.detail, at: new Date().toLocaleString() },
        ...(prev[balanceId] || []),
      ],
    }))
  }

  const upsertInventory = async (row, quantity, locationId) => {
    const payload = {
      productId: row.productId,
      quantity,
      locationId,
      serialNumber: row.serialNumber !== "-" ? row.serialNumber : null,
      lotNumber: row.lotNumber !== "-" ? row.lotNumber : null,
      updatedBy: "ui-operator",
      txnType: "adjust",
      referenceType: "MANUAL",
      reason: "Inventory adjustment/transfer",
    }

    const response = await fetch(`${API_URL}/inventory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.detail || body.error || "Inventory update failed")
    }

    await fetchAll()
  }

  const handleAdjust = async () => {
    if (!selectedRow) return
    try {
      await upsertInventory(selectedRow, Number(adjustQty) || 0, selectedRow.locationId)
      addHistory(selectedRow.id, { action: "Adjust", detail: `On-hand adjusted to ${Number(adjustQty) || 0}` })
      setSelectedRow(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to adjust inventory")
    }
  }

  const handleTransfer = async () => {
    if (!selectedRow || !transferLocationId) return
    try {
      await upsertInventory(selectedRow, selectedRow.onHand, transferLocationId)
      const target = locations.find((location) => location.id === transferLocationId)
      addHistory(selectedRow.id, {
        action: "Transfer",
        detail: `Moved to ${target ? `${target.zone}-${target.aisle}-${target.rack}` : transferLocationId}`,
      })
      setSelectedRow(null)
      setTransferLocationId("")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to transfer inventory")
    }
  }

  const toggleHold = (row) => {
    setHoldRows((prev) => {
      const next = new Set(prev)
      if (next.has(row.id)) {
        next.delete(row.id)
        addHistory(row.id, { action: "Unblock", detail: "Inventory released from hold" })
      } else {
        next.add(row.id)
        addHistory(row.id, { action: "Block", detail: "Inventory placed on hold" })
      }
      return next
    })
  }

  const handleDelete = async (row) => {
    if (role !== "admin") {
      alert("Only admin can remove inventory items")
      return
    }
    const confirmed = window.confirm(`Remove inventory item "${row.name}" (LP: ${row.serialNumber})?`)
    if (!confirmed) return
    try {
      setDeletingId(row.id)
      const response = await fetch(`${API_URL}/inventory/${row.id}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.detail || body.error || "Failed to remove inventory item")
      }
      addHistory(row.id, { action: "Delete", detail: "Inventory row removed by admin" })
      await fetchAll()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove inventory item")
    } finally {
      setDeletingId("")
    }
  }

  const getStatusBadge = (status) => {
    if (status === "available") return <Badge>Available</Badge>
    if (status === "allocated") return <Badge variant="secondary">Allocated</Badge>
    if (status === "hold") return <Badge variant="destructive">Hold</Badge>
    if (status === "damaged") return <Badge variant="outline">Damaged</Badge>
    return <Badge variant="outline">Expired</Badge>
  }

  if (loading) return <div className="p-6">Loading inventory...</div>
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <div>
        <h1>Inventory</h1>
        <p className="text-muted-foreground">Products in the Inventory</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by item, EAN, SKU, or License Plate..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="allocated">Allocated</SelectItem>
                <SelectItem value="hold">Hold</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            Inventory Balances ({filteredRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>EAN</TableHead>
                <TableHead>On Hand</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Bin</TableHead>
                <TableHead>License Plate</TableHead>
                <TableHead>Received Time</TableHead>
                <TableHead>Hazard</TableHead>
                <TableHead>Storage Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{row.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{row.sku}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{row.ean}</TableCell>
                  <TableCell>{row.onHand}</TableCell>
                  <TableCell>{row.available}</TableCell>
                  <TableCell className="font-mono">{row.primaryBin}</TableCell>
                  <TableCell className="font-mono">{row.serialNumber}</TableCell>
                  <TableCell>{formatReceivedAt(row.receivedAt)}</TableCell>
                  <TableCell>
                    <HazardBadge classification={row.classification} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.storageStatus === "RECEIVED" ? "secondary" : "default"}>{row.storageStatus}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(row.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRow(row)
                              setAdjustQty(String(row.onHand))
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Adjust Inventory</DialogTitle>
                            <DialogDescription>Set the new on-hand quantity for this balance.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2">
                            <Label>New Quantity</Label>
                            <Input type="number" min="0" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} />
                          </div>
                          <div className="flex justify-end">
                            <Button onClick={handleAdjust}>Save Adjustment</Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRow(row)
                              setTransferLocationId(row.locationId)
                            }}
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Transfer Inventory</DialogTitle>
                            <DialogDescription>Move this stock balance to another location/bin.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2">
                            <Label>Destination Location</Label>
                            <Select value={transferLocationId} onValueChange={setTransferLocationId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select destination" />
                              </SelectTrigger>
                              <SelectContent>
                                {locations.map((location) => (
                                  <SelectItem key={location.id} value={location.id}>
                                    {location.name} ({location.zone}-{location.aisle}-{location.rack})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-end">
                            <Button onClick={handleTransfer}>Confirm Transfer</Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button variant="outline" size="sm" onClick={() => toggleHold(row)}>
                        <ShieldAlert className="h-4 w-4" />
                      </Button>
                      {role === "admin" && (
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(row)} disabled={deletingId === row.id}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <History className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Inventory History</DialogTitle>
                            <DialogDescription>
                              {row.name} ({row.sku}) - LP {row.serialNumber}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3">
                            {(historyByBalanceKey[row.id] || []).length === 0 ? (
                              <p className="text-sm text-muted-foreground">No history entries yet.</p>
                            ) : (
                              historyByBalanceKey[row.id].map((entry) => (
                                <div key={entry.id} className="p-3 border rounded-lg">
                                  <p className="font-medium">{entry.action}</p>
                                  <p className="text-sm text-muted-foreground">{entry.detail}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{entry.at}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
