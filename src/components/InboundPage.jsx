import { useEffect, useMemo, useRef, useState } from "react"
import { useIsMobile } from "./ui/use-mobile"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Plus, Trash2, Camera, Keyboard, PackageCheck, ScanLine, AlertTriangle } from "lucide-react"

const API_URL = "http://localhost:5000/api"

const generateLicensePlate = () => `LP-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`
const normalizeCode = (value) => (value || "").trim().toLowerCase()

const createLine = () => ({
  id: crypto.randomUUID(),
  productId: "",
  productName: "",
  barcode: "",
  expectedQty: 1,
  receivedQty: 1,
  damagedQty: 0,
  shortReason: "",
  lotNumber: "",
  expiryDate: "",
  qualityHold: "no",
  licensePlate: generateLicensePlate(),
})

export function InboundPage() {
  const isMobile = useIsMobile()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const zxingReaderRef = useRef(null)
  const zxingControlsRef = useRef(null)
  const scanRafRef = useRef(null)
  const scanBusyRef = useRef(false)
  const [activeTab, setActiveTab] = useState("manual")
  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])
  const [quickBarcode, setQuickBarcode] = useState("")
  const [lines, setLines] = useState([createLine()])
  const [records, setRecords] = useState([])

  const [asnNumber, setAsnNumber] = useState("")
  const [poNumber, setPoNumber] = useState("")
  const [carrier, setCarrier] = useState("")
  const [trailerNumber, setTrailerNumber] = useState("")
  const [dockDoor, setDockDoor] = useState("D-01")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedLine, setSelectedLine] = useState(null)
  const [isCameraScanning, setIsCameraScanning] = useState(false)
  const [scanError, setScanError] = useState("")
  const [scanEngine, setScanEngine] = useState("")

  useEffect(() => {
    fetchProducts()
    fetchLocations()
    return () => {
      stopCameraScan()
    }
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products`)
      const data = await res.json()
      setProducts(data)
    } catch (err) {
      console.error("Failed to fetch products:", err)
    }
  }

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_URL}/locations`)
      const data = await res.json()
      setLocations(data)
    } catch (err) {
      console.error("Failed to fetch locations:", err)
    }
  }

  const receivingLocation = useMemo(() => {
    const explicitReceiving = locations.find((location) => location.locationType === "receiving")
    if (explicitReceiving) return explicitReceiving
    const byZone = locations.find((location) => (location.zone || "").toUpperCase() === "R")
    if (byZone) return byZone
    const byName = locations.find((location) => (location.name || "").toLowerCase().includes("receiving"))
    return byName || null
  }, [locations])

  const receivingZoneLabel = receivingLocation
    ? `${receivingLocation.name} (${receivingLocation.zone}-${receivingLocation.aisle}-${receivingLocation.rack})`
    : "Not configured"

  const exceptions = useMemo(() => {
    return lines.filter((line) => {
      const variance = line.receivedQty !== line.expectedQty
      const damaged = line.damagedQty > 0
      const missingReason = line.receivedQty < line.expectedQty && !line.shortReason.trim()
      return variance || damaged || missingReason
    })
  }, [lines])

  const updateLine = (lineId, field, value) => {
    setLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, [field]: value } : line)))
  }

  const addLine = () => {
    setLines((prev) => [...prev, createLine()])
  }

  const removeLine = (lineId) => {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((line) => line.id !== lineId)))
  }

  const addLineFromCode = (value) => {
    if (!value || value.length < 3) return false
    const scanCode = normalizeCode(value)
    const product = products.find((p) => {
      const ean = normalizeCode(p.ean)
      const sku = normalizeCode(p.sku)
      return ean === scanCode || sku === scanCode
    })
    if (!product) return false

    setLines((prev) => [
      ...prev,
      {
        ...createLine(),
        productId: product.id,
        productName: product.name,
        barcode: product.ean || product.sku,
      },
    ])
    return true
  }

  const handleQuickBarcode = (value) => {
    setQuickBarcode(value)
    if (addLineFromCode(value)) {
      setQuickBarcode("")
    }
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
        const matched = addLineFromCode(rawValue)
        if (matched) {
          setQuickBarcode("")
          setScanError("")
          setActiveTab("manual")
          stopCameraScan()
          return
        }
      }
    } catch (err) {
      setScanError("Camera active, but barcode not detected yet.")
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
        const matched = addLineFromCode(rawValue)
        if (matched) {
          setQuickBarcode("")
          setScanError("")
          setActiveTab("manual")
          stopCameraScan()
        }
      })

      zxingControlsRef.current = controls
      setIsCameraScanning(true)
      setScanEngine("zxing")
    } catch (err) {
      setScanError("Barcode scanning is not supported in this browser. Use Chrome/Edge or manual EAN entry.")
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
            formats: ["ean_13", "ean_8", "code_128", "upc_a", "upc_e"],
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
    } catch (err) {
      setScanError("Unable to access desktop camera. Check browser camera permissions.")
      stopCameraScan()
    }
  }

  const handleSimulateScan = () => {
    if (products.length === 0) return

    const randomProduct = products[Math.floor(Math.random() * products.length)]

    setSelectedLine({
      ...createLine(),
      productId: randomProduct.id,
      productName: randomProduct.name,
      barcode: randomProduct.ean || randomProduct.sku,
      expectedQty: 1,
      receivedQty: 1,
    })
    setDialogOpen(true)
  }

  const confirmScannedLine = () => {
    if (!selectedLine) return
    setLines((prev) => [...prev, selectedLine])
    setSelectedLine(null)
    setDialogOpen(false)
  }

  const confirmReceipt = async () => {
    const validLines = lines.filter((line) => line.productName && line.barcode)
    if (validLines.length === 0) {
      alert("Add at least one receiving line before confirming receipt")
      return
    }

    if (!receivingLocation) {
      alert("No receiving zone found. Create a location with type 'receiving' (or zone 'R').")
      return
    }

    try {
      const orderPayload = {
        orderNumber: asnNumber || `ASN-${Date.now()}`,
        customerId: "system",
        type: "inbound",
        status: "processing",
        notes: `PO ${poNumber || "N/A"} | Carrier ${carrier || "N/A"} | Trailer ${trailerNumber || "N/A"} | Dock ${dockDoor}`,
        orderItems: validLines.map((line) => ({
          productId:
            line.productId ||
            products.find((p) => normalizeCode(p.ean) === normalizeCode(line.barcode) || normalizeCode(p.sku) === normalizeCode(line.barcode))?.id,
          quantity: Math.max(line.receivedQty - line.damagedQty, 0),
        })),
      }

      const response = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || "Failed to confirm receipt")
      }

      for (const line of validLines) {
        const productId =
          line.productId ||
          products.find((p) => normalizeCode(p.ean) === normalizeCode(line.barcode) || normalizeCode(p.sku) === normalizeCode(line.barcode))?.id
        const netReceivedQty = Math.max(line.receivedQty - line.damagedQty, 0)
        const licensePlate = line.licensePlate || generateLicensePlate()

        if (!productId || netReceivedQty <= 0) continue

        const inventoryRes = await fetch(`${API_URL}/inventory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            quantity: netReceivedQty,
            locationId: receivingLocation.id,
            lotNumber: line.lotNumber || null,
            serialNumber: licensePlate,
            expiryDate: line.expiryDate || null,
            updatedBy: "receiving-user",
            txnType: "receive",
            referenceType: "LICENSE_PLATE",
            referenceId: licensePlate,
            reason: "Received into receiving zone",
          }),
        })

        if (!inventoryRes.ok) {
          const body = await inventoryRes.json().catch(() => ({}))
          throw new Error(body.detail || body.error || "Failed to place received items into receiving zone")
        }
      }

      const newRecords = validLines.map((line) => ({
        id: `${line.id}-${Date.now()}`,
        asnNumber: asnNumber || "AUTO-ASN",
        product: line.productName,
        licensePlate: line.licensePlate,
        receivedQty: line.receivedQty,
        location: receivingZoneLabel,
        status: "RECEIVED",
        date: new Date().toISOString().split("T")[0],
      }))

      setRecords((prev) => [...newRecords, ...prev])
      setLines([createLine()])
      setQuickBarcode("")
      alert(`Receipt confirmed for ${validLines.length} line(s). Inventory moved to Receiving Zone.`)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to confirm receipt")
    }
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Receiving</h1>
          <p className="text-muted-foreground">Receive goods.</p>
        </div>
        <Button onClick={confirmReceipt}>
          <PackageCheck className="h-4 w-4 mr-2" />
          Confirm Receipt
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inbound Document Context</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>ASN Number</Label>
            <Input placeholder="ASN-2026-00124" value={asnNumber} onChange={(e) => setAsnNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>PO Number</Label>
            <Input placeholder="PO-93077" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Carrier</Label>
            <Input placeholder="Carrier name" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Trailer / Container</Label>
            <Input placeholder="TRL-4409" value={trailerNumber} onChange={(e) => setTrailerNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Dock Door</Label>
            <Select value={dockDoor} onValueChange={setDockDoor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="D-01">D-01</SelectItem>
                <SelectItem value="D-02">D-02</SelectItem>
                <SelectItem value="D-03">D-03</SelectItem>
                <SelectItem value="D-04">D-04</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receiving Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">All confirmed receipts are stored here first: <span className="font-medium text-foreground">{receivingZoneLabel}</span></p>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            {isMobile ? "Manual" : "Manual Entry"}
          </TabsTrigger>
          <TabsTrigger value="scan" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            {isMobile ? "Scan" : "Scan Assist"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                Quick Barcode Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="barcode">EAN / Barcode</Label>
                  <Input
                    id="barcode"
                    placeholder="Scan or type EAN code"
                    value={quickBarcode}
                    onChange={(e) => handleQuickBarcode(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    EAN/manual code is validated against Products Master, then line is auto-added with License Plate
                  </p>
                </div>

                {lines.map((line, index) => (
                  <Card key={line.id} className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Line #{index + 1}</span>
                      <Button variant="destructive" size="sm" onClick={() => removeLine(line.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Product</Label>
                        <Select
                          value={line.productName || ""}
                          onValueChange={(value) => {
                            const selectedProduct = products.find((product) => product.name === value)
                            updateLine(line.id, "productName", value)
                            updateLine(line.id, "productId", selectedProduct?.id || "")
                            updateLine(line.id, "barcode", selectedProduct?.ean || selectedProduct?.sku || "")
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.name}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>EAN / Barcode</Label>
                        <Input
                          value={line.barcode}
                          onChange={(e) => updateLine(line.id, "barcode", e.target.value)}
                          placeholder="EAN"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>License Plate</Label>
                        <Input
                          value={line.licensePlate}
                          onChange={(e) => updateLine(line.id, "licensePlate", e.target.value)}
                          placeholder="LP-..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Expected Qty</Label>
                        <Input
                          type="number"
                          min="0"
                          value={line.expectedQty}
                          onChange={(e) => updateLine(line.id, "expectedQty", Number(e.target.value) || 0)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Received Qty</Label>
                        <Input
                          type="number"
                          min="0"
                          value={line.receivedQty}
                          onChange={(e) => updateLine(line.id, "receivedQty", Number(e.target.value) || 0)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Damaged Qty</Label>
                        <Input
                          type="number"
                          min="0"
                          value={line.damagedQty}
                          onChange={(e) => updateLine(line.id, "damagedQty", Number(e.target.value) || 0)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Short / Over Reason</Label>
                        <Input
                          value={line.shortReason}
                          onChange={(e) => updateLine(line.id, "shortReason", e.target.value)}
                          placeholder="Required if variance"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Lot / Batch</Label>
                        <Input
                          value={line.lotNumber}
                          onChange={(e) => updateLine(line.id, "lotNumber", e.target.value)}
                          placeholder="Optional"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Expiry Date</Label>
                        <Input
                          type="date"
                          value={line.expiryDate}
                          onChange={(e) => updateLine(line.id, "expiryDate", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Quality Hold</Label>
                        <Select
                          value={line.qualityHold}
                          onValueChange={(value) => updateLine(line.id, "qualityHold", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no">No</SelectItem>
                            <SelectItem value="yes">Yes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}

                <Button variant="outline" onClick={addLine} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Receiving Line
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scan" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanLine className="h-5 w-5" />
                {isMobile ? "Mobile Camera Scan" : "Desktop Camera Scan"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-3">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover rounded-md bg-black"
                  playsInline
                  muted
                  autoPlay
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {!isCameraScanning ? (
                  <Button onClick={startCameraScan} size="lg">
                    <Camera className="h-5 w-5 mr-2" />
                    Start Camera Scan
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={stopCameraScan} size="lg">
                    Stop Camera
                  </Button>
                )}

                <Button onClick={handleSimulateScan} variant="outline" size="lg" disabled={products.length === 0}>
                  <ScanLine className="h-5 w-5 mr-2" />
                  Simulate Scan
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Point desktop camera at EAN barcode. On detection, the receiving line is auto-added.
              </p>
              {scanEngine && <p className="text-xs text-muted-foreground">Scanner engine: {scanEngine}</p>}
              {scanError && <p className="text-sm text-red-600">{scanError}</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Exception Queue ({exceptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No receiving exceptions detected.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Damaged</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptions.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono">{line.licensePlate || "N/A"}</TableCell>
                    <TableCell className="font-mono">{line.barcode || "N/A"}</TableCell>
                    <TableCell>{line.productName || "Unassigned"}</TableCell>
                    <TableCell>{line.expectedQty}</TableCell>
                    <TableCell>{line.receivedQty}</TableCell>
                    <TableCell>{line.damagedQty}</TableCell>
                    <TableCell>{line.shortReason || "Reason required"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {records.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Receiving Records</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ASN</TableHead>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Received Qty</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.slice(0, 10).map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.asnNumber}</TableCell>
                    <TableCell className="font-mono">{record.licensePlate}</TableCell>
                    <TableCell>{record.product}</TableCell>
                    <TableCell>{record.receivedQty}</TableCell>
                    <TableCell>{record.location}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">{record.status}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scanned Item Details</DialogTitle>
          </DialogHeader>
          {selectedLine && (
            <div className="space-y-4">
              <div>
                <Label>Barcode</Label>
                <Input value={selectedLine.barcode} readOnly className="font-mono" />
              </div>
              <div>
                <Label>Product</Label>
                <Input value={selectedLine.productName} readOnly />
              </div>
              <div>
                <Label>License Plate</Label>
                <Input
                  value={selectedLine.licensePlate}
                  onChange={(e) => setSelectedLine({ ...selectedLine, licensePlate: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Expected Qty</Label>
                  <Input
                    type="number"
                    min="0"
                    value={selectedLine.expectedQty}
                    onChange={(e) => setSelectedLine({ ...selectedLine, expectedQty: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Received Qty</Label>
                  <Input
                    type="number"
                    min="0"
                    value={selectedLine.receivedQty}
                    onChange={(e) => setSelectedLine({ ...selectedLine, receivedQty: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmScannedLine}>Add Line</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
