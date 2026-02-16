import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { ScanLine, Boxes, ArrowRight } from "lucide-react"
import { HazardBadge } from "./HazardBadge"

const API_URL = "http://localhost:5000/api"
const formatReceivedAt = (value) => (value ? new Date(value).toLocaleString() : "-")

export function PutawayPage() {
  const [queue, setQueue] = useState([])
  const [racks, setRacks] = useState([])
  const [loading, setLoading] = useState(true)

  const [licensePlateScan, setLicensePlateScan] = useState("")
  const [selectedInventoryId, setSelectedInventoryId] = useState("")
  const [rackScan, setRackScan] = useState("")
  const [selectedRackCode, setSelectedRackCode] = useState("")

  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = async () => {
    try {
      setLoading(true)
      const [queueRes, racksRes] = await Promise.all([
        fetch(`${API_URL}/inventory/putaway-queue`),
        fetch(`${API_URL}/racks`),
      ])

      if (!queueRes.ok || !racksRes.ok) {
        throw new Error("Failed to load putaway data")
      }

      const [queueData, racksData] = await Promise.all([queueRes.json(), racksRes.json()])
      setQueue(queueData)
      setRacks(racksData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const suggestedRackByInventoryId = useMemo(() => {
    const result = {}
    for (const item of queue) {
      const classification = String(item.classification || "NORMAL").toUpperCase()
      const suggestion = racks.find((rack) => rack.zoneType === classification && rack.currentLoad < rack.capacity)
      if (suggestion) {
        result[item.id] = suggestion.rackCode
      }
    }
    return result
  }, [queue, racks])

  const selectedItem = queue.find((item) => item.id === selectedInventoryId) || queue.find((item) => item.serialNumber === licensePlateScan)

  useEffect(() => {
    if (!selectedItem) return
    setSelectedInventoryId(selectedItem.id)
    setLicensePlateScan(selectedItem.serialNumber || "")
    if (!selectedRackCode) {
      setSelectedRackCode(suggestedRackByInventoryId[selectedItem.id] || "")
    }
  }, [selectedItem, selectedRackCode, suggestedRackByInventoryId])

  const selectedRack = racks.find((rack) => rack.rackCode === selectedRackCode)

  const fetchServerSuggestion = async (lp) => {
    try {
      const res = await fetch(`${API_URL}/inventory/putaway-suggestion/${encodeURIComponent(lp)}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "No suitable rack available")
      }
      const body = await res.json()
      const suggested = body.suggestedRack?.rackCode || ""
      setSelectedRackCode(suggested)
      return suggested
    } catch (err) {
      alert(err instanceof Error ? err.message : "No suitable rack available")
      setSelectedRackCode("")
      return ""
    }
  }

  const handleScanLicensePlate = async (value) => {
    setLicensePlateScan(value)
    const matched = queue.find((item) => item.serialNumber === value)
    if (matched) {
      setSelectedInventoryId(matched.id)
      setRackScan("")
      await fetchServerSuggestion(matched.serialNumber)
    }
  }

  const completePutaway = async () => {
    if (!selectedItem) {
      alert("Scan/select a License Plate first")
      return
    }
    if (!selectedRackCode) {
      alert("Select target rack first")
      return
    }

    if (!rackScan || rackScan !== selectedRackCode) {
      alert(`Rack scan mismatch. Scan ${selectedRackCode} to confirm putaway.`)
      return
    }

    try {
      const response = await fetch(`${API_URL}/inventory/putaway`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licensePlate: selectedItem.serialNumber,
          rackCode: selectedRackCode,
          updatedBy: "putaway-user",
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || "Failed to complete putaway")
      }

      await refreshData()
      setLicensePlateScan("")
      setSelectedInventoryId("")
      setRackScan("")
      setSelectedRackCode("")
      alert("Putaway completed. Status changed to STORED.")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to complete putaway")
    }
  }

  if (loading) return <div className="p-6">Loading putaway queue...</div>

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1>Putaway</h1>
          <p className="text-muted-foreground">Scan License Plate, confirm suggested rack, and store inventory.</p>
        </div>
        <Badge variant="secondary">Awaiting Putaway: {queue.length}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Putaway Execution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Scan License Plate</Label>
              <Input
                placeholder="LP-..."
                value={licensePlateScan}
                onChange={(e) => {
                  void handleScanLicensePlate(e.target.value)
                }}
              />
            </div>
            <div>
              <Label>Suggested Rack</Label>
              <Select value={selectedRackCode} onValueChange={setSelectedRackCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rack" />
                </SelectTrigger>
                <SelectContent>
                  {racks
                    .filter((rack) => rack.currentLoad < rack.capacity)
                    .map((rack) => (
                      <SelectItem key={rack.id} value={rack.rackCode}>
                        {rack.rackCode} ({rack.zoneType})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hazard Class</Label>
              <div className="h-10 flex items-center">
                <HazardBadge classification={selectedItem?.classification || "NORMAL"} />
              </div>
            </div>
            <div>
              <Label>Scan Rack Confirmation</Label>
              <Input
                placeholder={selectedRackCode || "A-1-1"}
                value={rackScan}
                onChange={(e) => setRackScan(e.target.value)}
              />
            </div>
          </div>

          {selectedRack && (
            <p className="text-sm text-muted-foreground">
              Rack load: {selectedRack.currentLoad}/{selectedRack.capacity}
            </p>
          )}

          <div className="flex justify-end">
            <Button onClick={completePutaway}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Confirm Putaway
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            Receiving Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>License Plate</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Received Time</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Suggested Rack</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((item) => {
                const suggestedRackCode = suggestedRackByInventoryId[item.id]
                return (
                  <TableRow
                    key={item.id}
                    className={selectedInventoryId === item.id ? "bg-accent/50" : ""}
                    onClick={() => {
                      setSelectedInventoryId(item.id)
                      setLicensePlateScan(item.serialNumber || "")
                      setSelectedRackCode(suggestedRackCode || "")
                      setRackScan("")
                    }}
                  >
                    <TableCell className="font-mono">{item.serialNumber || "N/A"}</TableCell>
                    <TableCell className="font-mono">{item.product?.sku || "-"}</TableCell>
                    <TableCell>{item.product?.name || "-"}</TableCell>
                    <TableCell>{item.onHandQty}</TableCell>
                    <TableCell>{formatReceivedAt(item.createdAt)}</TableCell>
                    <TableCell>
                      <HazardBadge classification={item.classification} />
                    </TableCell>
                    <TableCell>{suggestedRackCode || "-"}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">RECEIVED</span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
