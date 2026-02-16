import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Badge } from "./ui/badge"
import { Label } from "./ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Send, ScanLine, Truck } from "lucide-react"
import { HazardBadge } from "./HazardBadge"

const API_URL = "http://localhost:5000/api"
const formatReceivedAt = (value) => (value ? new Date(value).toLocaleString() : "-")

export function ShippingPage() {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [licensePlate, setLicensePlate] = useState("")
  const [quantityToDispatch, setQuantityToDispatch] = useState("1")
  const [selectedId, setSelectedId] = useState("")
  const [recentDispatches, setRecentDispatches] = useState([])

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    await Promise.all([fetchInventory(), fetchDispatchHistory()])
  }

  const fetchInventory = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/inventory`)
      if (!res.ok) throw new Error("Failed to fetch inventory")
      const data = await res.json()
      setInventory(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDispatchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/inventory/dispatch-history?limit=100`)
      if (!res.ok) throw new Error("Failed to fetch dispatch history")
      const data = await res.json()
      setRecentDispatches(
        data.map((item) => ({
          id: item.id,
          licensePlate: item.licensePlate,
          qty: item.qty,
          message: item.reason || "Outbound dispatch",
          at: new Date(item.createdAt).toLocaleString(),
        })),
      )
    } catch (err) {
      console.error(err)
    }
  }

  const dispatchReady = useMemo(() => {
    return inventory.filter((item) => item.storageStatus === "STORED" && (item.quantity || 0) > 0)
  }, [inventory])

  const selectedItem = dispatchReady.find((item) => item.id === selectedId) || dispatchReady.find((item) => item.serialNumber === licensePlate)

  const handleLicensePlateScan = (value) => {
    setLicensePlate(value)
    const matched = dispatchReady.find((item) => item.serialNumber === value)
    if (matched) {
      setSelectedId(matched.id)
      setQuantityToDispatch("1")
    }
  }

  const handleDispatch = async () => {
    const lp = licensePlate || selectedItem?.serialNumber
    if (!lp) {
      alert("Scan or enter license plate first")
      return
    }

    try {
      const res = await fetch(`${API_URL}/inventory/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licensePlate: lp,
          quantityToDispatch: Number(quantityToDispatch),
          updatedBy: "dispatch-user",
        }),
      })

      const raw = await res.text()
      let body = {}
      try {
        body = raw ? JSON.parse(raw) : {}
      } catch {
        body = { raw }
      }
      if (!res.ok) {
        throw new Error(body.error || body.detail || body.raw || "Dispatch failed")
      }

      await Promise.all([fetchInventory(), fetchDispatchHistory()])
      setLicensePlate("")
      setSelectedId("")
      setQuantityToDispatch("1")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Dispatch failed")
    }
  }

  if (loading) return <div className="p-6">Loading dispatch module...</div>

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1>Outbound Dispatch</h1>
          <p className="text-muted-foreground">Dispatch only STORED inventory by License Plate and quantity.</p>
        </div>
        <Badge variant="secondary">Dispatch Ready: {dispatchReady.length}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Dispatch Execution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>License Plate</Label>
              <Input
                placeholder="LP-..."
                value={licensePlate}
                onChange={(e) => handleLicensePlateScan(e.target.value)}
              />
            </div>
            <div>
              <Label>Quantity To Dispatch</Label>
              <Input
                type="number"
                min="1"
                value={quantityToDispatch}
                onChange={(e) => setQuantityToDispatch(e.target.value)}
              />
            </div>
            <div>
              <Label>Available</Label>
              <Input value={selectedItem ? String(selectedItem.quantity || 0) : "-"} readOnly />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleDispatch}>
              <Send className="h-4 w-4 mr-2" />
              Dispatch
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            STORED Inventory Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>License Plate</TableHead>
                <TableHead>EAN</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Received Time</TableHead>
                <TableHead>Hazard</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dispatchReady.map((item) => (
                <TableRow
                  key={item.id}
                  className={selectedItem?.id === item.id ? "bg-accent/50" : ""}
                  onClick={() => {
                    setSelectedId(item.id)
                    setLicensePlate(item.serialNumber || "")
                    setQuantityToDispatch("1")
                  }}
                >
                  <TableCell className="font-mono">{item.serialNumber || "-"}</TableCell>
                  <TableCell className="font-mono">{item.product?.ean || item.product?.sku || "-"}</TableCell>
                  <TableCell className="font-mono">{item.product?.sku || "-"}</TableCell>
                  <TableCell>{item.product?.name || "-"}</TableCell>
                  <TableCell>{item.quantity || 0}</TableCell>
                  <TableCell>{item.rackLocation || (item.location ? `${item.location.zone}-${item.location.aisle}-${item.location.rack}` : "-")}</TableCell>
                  <TableCell>{formatReceivedAt(item.createdAt)}</TableCell>
                  <TableCell>
                    <HazardBadge classification={item.classification} />
                  </TableCell>
                  <TableCell>
                    <Badge>{item.storageStatus}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {recentDispatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Dispatch Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDispatches.slice(0, 10).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.licensePlate}</TableCell>
                    <TableCell>{item.qty}</TableCell>
                    <TableCell>{item.message}</TableCell>
                    <TableCell>{item.at}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
