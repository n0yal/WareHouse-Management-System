import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { Search, Package, X, MapPin, Layers, Grid3X3, LayoutGrid } from "lucide-react"
import { WarehouseSeatMap } from "./WarehouseSeatMap"

const API_URL = "http://localhost:5000/api"

const getUtilizationColor = (utilization) => {
  if (utilization < 60) return "bg-green-500"
  if (utilization <= 85) return "bg-yellow-500"
  return "bg-red-500"
}

const getUtilizationStatus = (utilization) => {
  if (utilization < 60) return "low"
  if (utilization <= 85) return "medium"
  return "high"
}

export function WarehouseLayoutPage() {
  const [layoutData, setLayoutData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedRack, setSelectedRack] = useState(null)
  const [rackDetails, setRackDetails] = useState(null)
  const [rackLoading, setRackLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [viewMode, setViewMode] = useState("card")

  useEffect(() => {
    void fetchLayout()
  }, [])

  const fetchLayout = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/warehouse/layout`)
      if (!res.ok) throw new Error("Failed to fetch warehouse layout")
      const data = await res.json()
      setLayoutData(data)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch warehouse layout")
    } finally {
      setLoading(false)
    }
  }

  const fetchRackDetails = async (rackCode) => {
    try {
      setRackLoading(true)
      const res = await fetch(`${API_URL}/warehouse/rack/${rackCode}`)
      if (!res.ok) throw new Error("Failed to fetch rack details")
      const data = await res.json()
      setRackDetails(data)
    } catch (err) {
      console.error("Failed to fetch rack details:", err)
    } finally {
      setRackLoading(false)
    }
  }

  const handleRackClick = (rack) => {
    setSelectedRack(rack)
    void fetchRackDetails(rack.rackCode)
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim() || searchQuery.length < 2) return
    
    try {
      setSearching(true)
      const res = await fetch(`${API_URL}/warehouse/search?q=${encodeURIComponent(searchQuery)}`)
      if (!res.ok) throw new Error("Search failed")
      const data = await res.json()
      setSearchResults(data)
    } catch (err) {
      console.error("Search failed:", err)
    } finally {
      setSearching(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
  }

  const allRacks = useMemo(() => {
    if (!layoutData?.zones) return []
    return layoutData.zones.flatMap(zone => zone.racks)
  }, [layoutData])

  const highlightedRack = useMemo(() => {
    if (searchResults.length === 0) return null
    const rackLocations = new Set(searchResults
      .filter(r => r.rackLocation)
      .map(r => r.rackLocation))
    return allRacks.find(rack => rackLocations.has(rack.rackCode))
  }, [searchResults, allRacks])

  if (loading) return <div className="p-6">Loading warehouse layout...</div>
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>

  if (viewMode === "seatmap") {
    return <WarehouseSeatMap />
  }

  return (
    <div className="p-6 h-full overflow-hidden flex flex-col gap-6">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Warehouse Layout</h1>
          <p className="text-muted-foreground">
            Interactive floor plan - {layoutData?.totalRacks || 0} racks, {layoutData?.totalItems || 0} items
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === "card" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("card")}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Card
            </Button>
            <Button
              variant={viewMode === "seatmap" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("seatmap")}
            >
              <Grid3X3 className="h-4 w-4 mr-1" />
              Seat Map
            </Button>
          </div>
        
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search product, SKU, license plate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button type="submit" size="sm" disabled={searching || searchQuery.length < 2}>
              {searching ? "..." : "Search"}
            </Button>
            {searchResults.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={clearSearch}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </form>
        </div>
      </div>

      {searchResults.length > 0 && (
        <Card className="shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Search Results ({searchResults.length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-48 overflow-auto">
            <div className="space-y-2">
              {searchResults.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{item.productName}</span>
                      <span className="text-muted-foreground ml-2">({item.productSku})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={item.rackLocation ? "default" : "secondary"}>
                      {item.rackLocation || "Receiving"}
                    </Badge>
                    <span className="text-muted-foreground">Qty: {item.quantity}</span>
                    {item.licensePlate && (
                      <span className="text-xs text-muted-foreground font-mono">
                        LP: {item.licensePlate}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {layoutData?.zones?.map((zone) => (
            <Card key={zone.name} className={`${highlightedRack ? 'opacity-50' : ''} transition-opacity`}>
              <CardHeader className="pb-3" style={{ borderLeft: `4px solid ${zone.color}` }}>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" style={{ color: zone.color }} />
                  {zone.name}
                  <Badge variant="outline" className="ml-auto">
                    {zone.racks.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {zone.racks.map((rack) => (
                    <button
                      key={rack.id}
                      onClick={() => handleRackClick(rack)}
                      className={`w-full p-3 rounded-lg border transition-all text-left ${
                        selectedRack?.id === rack.id
                          ? "border-primary bg-primary/10"
                          : highlightedRack?.id === rack.id
                          ? "border-green-500 bg-green-500/10 animate-pulse"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm font-medium">{rack.rackCode}</span>
                        <Badge
                          variant={getUtilizationStatus(rack.utilization) === "low" ? "secondary" : 
                                   getUtilizationStatus(rack.utilization) === "medium" ? "outline" : "destructive"}
                          className="text-xs"
                        >
                          {rack.utilization}%
                        </Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 mb-1">
                        <div
                          className={`h-1.5 rounded-full ${getUtilizationColor(rack.utilization)}`}
                          style={{ width: `${Math.min(rack.utilization, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{rack.currentLoad}/{rack.capacity}</span>
                        <span>{rack.items.length} items</span>
                      </div>
                    </button>
                  ))}
                  {zone.racks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No racks</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {selectedRack && (
        <Card className="shrink-0 border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                <span className="font-mono">{selectedRack.rackCode}</span>
                <Badge variant="outline">{selectedRack.zone}</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>Utilization: 
                  <span className={`font-medium ml-1 ${
                    getUtilizationStatus(selectedRack.utilization) === "low" ? "text-green-600" :
                    getUtilizationStatus(selectedRack.utilization) === "medium" ? "text-yellow-600" : "text-red-600"
                  }`}>
                    {selectedRack.utilization}%
                  </span>
                </span>
                <span>Capacity: {selectedRack.currentLoad}/{selectedRack.capacity}</span>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedRack(null); setRackDetails(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rackLoading ? (
              <div className="text-center py-4">Loading rack details...</div>
            ) : rackDetails?.items?.length > 0 ? (
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {rackDetails.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{item.productName}</span>
                          <span className="text-muted-foreground ml-2 text-sm">({item.productSku})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {item.licensePlate && (
                          <span className="text-xs font-mono bg-background px-2 py-1 rounded">
                            {item.licensePlate}
                          </span>
                        )}
                        {item.lotNumber && (
                          <span className="text-xs text-muted-foreground">
                            Lot: {item.lotNumber}
                          </span>
                        )}
                        <Badge variant={item.classification === "FRAGILE" ? "destructive" : "secondary"}>
                          {item.classification}
                        </Badge>
                        <span className="font-medium">Qty: {item.quantity}</span>
                        {item.expiryDate && (
                          <span className="text-xs text-muted-foreground">
                            Exp: {new Date(item.expiryDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No items in this rack
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
