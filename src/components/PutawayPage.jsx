import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { ScanLine, Boxes, ArrowRight, Camera } from "lucide-react"
import { HazardBadge } from "./HazardBadge"
import { API_URL } from "../lib/api"
import { useIsMobile } from "./ui/use-mobile"
const formatReceivedAt = (value) => (value ? new Date(value).toLocaleString() : "-")
const normalizeCode = (value) => (value || "").trim().toLowerCase()

export function PutawayPage() {
  const isMobile = useIsMobile()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const zxingReaderRef = useRef(null)
  const zxingControlsRef = useRef(null)
  const scanRafRef = useRef(null)
  const scanBusyRef = useRef(false)
  const [queue, setQueue] = useState([])
  const [racks, setRacks] = useState([])
  const [loading, setLoading] = useState(true)

  const [licensePlateScan, setLicensePlateScan] = useState("")
  const [selectedInventoryId, setSelectedInventoryId] = useState("")
  const [rackScan, setRackScan] = useState("")
  const [selectedRackCode, setSelectedRackCode] = useState("")
  const [isCameraScanning, setIsCameraScanning] = useState(false)
  const [scanError, setScanError] = useState("")
  const [scanEngine, setScanEngine] = useState("")

  useEffect(() => {
    refreshData()
    return () => {
      stopCameraScan()
    }
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

  const applyRackScan = (value) => {
    if (!value || value.length < 2) return false
    const matchedRack = racks.find((rack) => normalizeCode(rack.rackCode) === normalizeCode(value))
    setRackScan(matchedRack ? matchedRack.rackCode : value)
    if (!matchedRack) return false
    setSelectedRackCode(matchedRack.rackCode)
    setScanError("")
    stopCameraScan()
    return true
  }

  const stopCameraScan = () => {
    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop()
      } catch {}
      zxingControlsRef.current = null
    }
    if (zxingReaderRef.current?.reset) {
      try {
        zxingReaderRef.current.reset()
      } catch {}
    }
    if (scanRafRef.current) {
      cancelAnimationFrame(scanRafRef.current)
      scanRafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCameraScanning(false)
    setScanEngine("")
    scanBusyRef.current = false
  }

  const scanFrame = async () => {
    if (!isCameraScanning || !videoRef.current || !detectorRef.current) return

    if (scanBusyRef.current) {
      scanRafRef.current = requestAnimationFrame(scanFrame)
      return
    }
    if (videoRef.current.readyState < 2) {
      scanRafRef.current = requestAnimationFrame(scanFrame)
      return
    }

    scanBusyRef.current = true
    try {
      const codes = await detectorRef.current.detect(videoRef.current)
      if (codes.length > 0) {
        const rawValue = codes[0]?.rawValue || ""
        const matched = applyRackScan(rawValue)
        if (!matched) {
          setScanError("Barcode detected, but it does not match any rack code.")
        }
      }
    } catch {
      setScanError("Camera active, but rack barcode not detected yet.")
    } finally {
      scanBusyRef.current = false
    }

    scanRafRef.current = requestAnimationFrame(scanFrame)
  }

  const startZXingFallback = async () => {
    setScanError("")
    try {
      const mod = await import("https://esm.sh/@zxing/browser@0.1.5")
      const BrowserMultiFormatReader = mod.BrowserMultiFormatReader
      const reader = new BrowserMultiFormatReader()
      zxingReaderRef.current = reader

      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (!result) return
        const rawValue = result.getText ? result.getText() : String(result.text || "")
        const matched = applyRackScan(rawValue)
        if (!matched) {
          setScanError("Barcode detected, but it does not match any rack code.")
        }
      })

      zxingControlsRef.current = controls
      setIsCameraScanning(true)
      setScanEngine("zxing")
    } catch {
      setScanError("Barcode scanning is not supported in this browser. Enter rack code manually.")
      stopCameraScan()
    }
  }

  const startCameraScan = async () => {
    setScanError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const BarcodeDetectorCtor = globalThis.BarcodeDetector
      if (BarcodeDetectorCtor) {
        try {
          detectorRef.current = new BarcodeDetectorCtor({
            formats: ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code"],
          })
        } catch {
          detectorRef.current = new BarcodeDetectorCtor()
        }
        setIsCameraScanning(true)
        setScanEngine("native")
        scanRafRef.current = requestAnimationFrame(scanFrame)
      } else {
        await startZXingFallback()
      }
    } catch {
      setScanError("Unable to access camera. Check browser camera permissions or type rack code manually.")
      stopCameraScan()
    }
  }

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

    if (!rackScan || normalizeCode(rackScan) !== normalizeCode(selectedRackCode)) {
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
                onChange={(e) => {
                  const value = e.target.value
                  setRackScan(value)
                  if (value.trim().length >= 2) {
                    applyRackScan(value)
                  } else {
                    setScanError("")
                  }
                }}
              />
            </div>
          </div>

          {selectedRack && (
            <p className="text-sm text-muted-foreground">
              Rack load: {selectedRack.currentLoad}/{selectedRack.capacity}
            </p>
          )}

          <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Rack Camera Scan</Label>
                <p className="text-sm text-muted-foreground">
                  {isMobile ? "Use mobile camera" : "Use desktop camera"} to scan the destination rack barcode.
                </p>
              </div>
              {!isCameraScanning ? (
                <Button onClick={startCameraScan} variant="outline">
                  <Camera className="h-4 w-4 mr-2" />
                  Scan Rack
                </Button>
              ) : (
                <Button variant="destructive" onClick={stopCameraScan}>
                  Stop Camera
                </Button>
              )}
            </div>

            <video
              ref={videoRef}
              className="w-full h-56 object-cover rounded-md bg-black"
              playsInline
              muted
              autoPlay
            />

            {scanEngine && <p className="text-xs text-muted-foreground">Scanner engine: {scanEngine}</p>}
            {scanError && <p className="text-sm text-red-600">{scanError}</p>}
          </div>

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
