import { useEffect, useState } from "react"
import { Badge } from "./ui/badge"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Search, Package, X, ChevronLeft, ChevronRight, Layers } from "lucide-react"
import * as Tooltip from "@radix-ui/react-tooltip"
import { API_URL } from "../lib/api"

const ZONE_COLORS = {
  'Receiving': { bg: '#3b82f6', light: '#1e3a5f', border: '#3b82f6' },
  'Storage A': { bg: '#22c55e', light: '#14532d', border: '#22c55e' },
  'Storage B': { bg: '#eab308', light: '#451a03', border: '#eab308' },
  'Storage C': { bg: '#14b8a6', light: '#134e4a', border: '#14b8a6' },
  'Packing': { bg: '#a855f7', light: '#3b0764', border: '#a855f7' },
  'Dispatch': { bg: '#f97316', light: '#431407', border: '#f97316' }
}

const SLOT_SIZE = 24
const SLOT_GAP = 6

function ShelfCell({ isOccupied, isHighlighted, product }) {
  const baseClassName = "flex h-6 w-6 items-center justify-center rounded-md border transition-transform duration-200 hover:scale-105"

  if (isOccupied) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div
            className={`${baseClassName} cursor-pointer shadow-sm`}
            style={{
              background: isHighlighted
                ? "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)"
                : "linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)",
              borderColor: isHighlighted ? "#fcd34d" : "#67e8f9",
              boxShadow: isHighlighted ? "0 6px 14px rgba(245, 158, 11, 0.28)" : "0 6px 14px rgba(8, 145, 178, 0.24)",
            }}
          >
            <span className="text-[10px] font-black text-white">{product?.quantity > 99 ? "99+" : product?.quantity}</span>
          </div>
        </Tooltip.Trigger>
        {product && (
          <Tooltip.Portal>
            <Tooltip.Content className="z-50 rounded-xl border border-slate-700 bg-slate-950 p-4 text-white shadow-2xl" sideOffset={8}>
              <div className="space-y-2">
                <div className="font-bold text-sm">{product.productName}</div>
                <div className="text-xs text-slate-400">SKU: {product.productSku}</div>
                <div className="text-xs">Qty: {product.quantity}</div>
              </div>
              <Tooltip.Arrow className="fill-slate-600" />
            </Tooltip.Content>
          </Tooltip.Portal>
        )}
      </Tooltip.Root>
    )
  }
  
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <div
          className={`${baseClassName} cursor-pointer bg-emerald-950/80`}
          style={{
            borderColor: "#22c55e",
            borderStyle: "dashed",
          }}
        >
          <span className="text-[10px] font-bold text-emerald-400">+</span>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="z-50 rounded-lg border border-slate-700 bg-slate-950 p-2 text-white shadow-xl" sideOffset={8}>
          <div className="text-xs text-slate-300">Empty Slot</div>
          <Tooltip.Arrow className="fill-slate-600" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

function RackIcon({ bins, capacity, highlightedBins = [] }) {
  const compsPerRow = 4
  const numRows = Math.ceil(capacity / compsPerRow)
  const rows = []

  for (let i = 0; i < numRows; i++) {
    const rowBins = bins.slice(i * compsPerRow, (i + 1) * compsPerRow)
    while (rowBins.length < compsPerRow) {
      rowBins.push({ occupied: false, item: null })
    }
    rows.push(rowBins)
  }

  return (
    <div
      className="mx-auto w-fit rounded-2xl border border-slate-700 bg-slate-950/90 p-2"
      style={{ minWidth: compsPerRow * SLOT_SIZE + (compsPerRow - 1) * SLOT_GAP + 28 }}
    >
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="mb-2 last:mb-0">
          <div className="mb-1 h-1.5 rounded-full bg-slate-600/80" />
          <div className="rounded-xl border border-slate-700 bg-slate-800/85 px-2 py-2">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${compsPerRow}, ${SLOT_SIZE}px)`,
                gap: `${SLOT_GAP}px`,
              }}
            >
              {row.map((bin, binIdx) => {
                const isHighlighted = highlightedBins.includes(bin.item?.productSku)
                const isOccupied = Boolean(bin.item && bin.item.quantity > 0)

                return (
                  <ShelfCell
                    key={`${rowIdx}-${binIdx}`}
                    isOccupied={isOccupied}
                    isHighlighted={isHighlighted}
                    product={bin.item}
                  />
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function RackCard({ rack, zoneColor, highlightedBins = [] }) {
  const utilization = rack.utilization
  const isHighUtil = utilization > 85
  const occupiedCount = rack.bins.filter(b => b.item && b.item.quantity > 0).length
  
  return (
    <div 
      className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-[0_12px_32px_rgba(2,6,23,0.32)] transition-all hover:-translate-y-0.5"
    >
      <div className="h-2" style={{ backgroundColor: zoneColor.bg }} />
      
      <div className="p-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <h3 className="font-mono text-sm font-bold tracking-wide text-slate-50">{rack.rackCode}</h3>
            <p className="mt-0.5 text-[11px] font-medium text-slate-300">{rack.zone}</p>
          </div>
          <div className="text-right">
            <div className="text-base font-black" style={{ color: isHighUtil ? '#f87171' : zoneColor.bg }}>
              {utilization}%
            </div>
            <div className="text-[9px] uppercase tracking-[0.16em] text-slate-400">Utilized</div>
          </div>
        </div>

        <div className="mb-2 rounded-xl border border-slate-700/70 bg-slate-950/70 p-2">
          <RackIcon 
            bins={rack.bins} 
            capacity={rack.capacity}
            highlightedBins={highlightedBins}
          />
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2 text-slate-300">
            <span>{occupiedCount} filled</span>
            <span>{rack.capacity - occupiedCount} empty</span>
          </div>
          <span className="font-semibold text-slate-50">{rack.currentLoad} units</span>
        </div>
      </div>
    </div>
  )
}

export function WarehouseSeatMap() {
  const [seatMapData, setSeatMapData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedZone, setSelectedZone] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    void fetchSeatMap()
  }, [])

  const fetchSeatMap = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/warehouse/seatmap`)
      if (!res.ok) throw new Error("Failed to fetch seat map")
      const data = await res.json()
      setSeatMapData(data)
      if (data.zones?.length > 0) {
        setSelectedZone(data.zones[0])
      }
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch seat map")
    } finally {
      setLoading(false)
    }
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

  const highlightedBins = searchResults.map(r => r.productSku)

  const currentZoneIndex = seatMapData?.zones?.findIndex(z => z.name === selectedZone?.name) ?? 0

  const goToNextZone = () => {
    if (!seatMapData?.zones) return
    const nextIndex = (currentZoneIndex + 1) % seatMapData.zones.length
    setSelectedZone(seatMapData.zones[nextIndex])
  }

  const goToPrevZone = () => {
    if (!seatMapData?.zones) return
    const prevIndex = (currentZoneIndex - 1 + seatMapData.zones.length) % seatMapData.zones.length
    setSelectedZone(seatMapData.zones[prevIndex])
  }

  const zoneStats = selectedZone ? {
    totalRacks: selectedZone.racks.length,
    totalCapacity: selectedZone.racks.reduce((sum, r) => sum + r.capacity, 0),
    totalLoad: selectedZone.racks.reduce((sum, r) => sum + r.currentLoad, 0),
    occupiedBins: selectedZone.racks.reduce((sum, r) => sum + r.bins.filter(b => b.item && b.item.quantity > 0).length, 0),
    emptyBins: selectedZone.racks.reduce((sum, r) => sum + r.bins.filter(b => !b.item || b.item.quantity === 0).length, 0)
  } : null

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-4"></div>
        <p className="text-slate-400 text-lg">Loading warehouse map...</p>
      </div>
    </div>
  )
  
  if (error) return <div className="p-6 text-red-400 text-lg bg-slate-950 h-full">Error: {error}</div>

  const zoneColor = ZONE_COLORS[selectedZone?.name] || ZONE_COLORS['Storage A']

  return (
    <Tooltip.Provider>
      <div className="h-full flex flex-col bg-slate-950 text-slate-50">
        <div className="p-6 pb-4">
          <div className="rounded-[28px] border border-slate-800 bg-slate-900 p-6 shadow-[0_24px_70px_rgba(2,6,23,0.35)]">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: zoneColor.light }}>
                  <Layers className="w-8 h-8" style={{ color: zoneColor.bg }} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Warehouse Map</h1>
                  <p className="text-slate-400">
                    {seatMapData?.totalRacks || 0} racks • {seatMapData?.totalItems || 0} items
                  </p>
                </div>
              </div>

              <form onSubmit={handleSearch} className="flex flex-1 flex-wrap items-center gap-3 xl:max-w-xl xl:justify-center">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 w-64 rounded-xl border-slate-700 bg-slate-800 pl-12 text-white placeholder:text-slate-500 md:w-80"
                  />
                </div>
                <Button type="submit" disabled={searching || searchQuery.length < 2} className="h-12 px-6 rounded-xl" style={{ backgroundColor: zoneColor.bg }}>
                  {searching ? "..." : "Search"}
                </Button>
                {searchResults.length > 0 && (
                  <Button type="button" variant="ghost" onClick={clearSearch} className="h-12 w-12 rounded-xl text-slate-400">
                    <X className="h-5 w-5" />
                  </Button>
                )}
              </form>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" size="icon" onClick={goToPrevZone} className="h-12 w-12 rounded-full border-slate-700 text-slate-300 hover:bg-slate-800">
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                
                <select 
                  value={selectedZone?.name || ''}
                  onChange={(e) => {
                    const zone = seatMapData?.zones?.find(z => z.name === e.target.value)
                    if (zone) setSelectedZone(zone)
                  }}
                  className="h-12 px-6 rounded-xl border-2 bg-slate-800 border-slate-700 text-white font-bold cursor-pointer min-w-[180px]"
                  style={{ borderColor: zoneColor.bg }}
                >
                  {seatMapData?.zones?.map(zone => (
                    <option key={zone.name} value={zone.name} className="bg-slate-800">
                      {zone.name} ({zone.racks.length})
                    </option>
                  ))}
                </select>

                <Button variant="outline" size="icon" onClick={goToNextZone} className="h-12 w-12 rounded-full border-slate-700 text-slate-300 hover:bg-slate-800">
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {searchResults.length > 0 && (
          <div className="px-6 pb-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-medium">Search Results ({searchResults.length})</span>
                <Badge style={{ backgroundColor: zoneColor.bg }}>{searchResults.length} found</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchResults.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2">
                    <Package className="w-4 h-4 text-slate-400" />
                    <span className="text-white text-sm">{item.productName}</span>
                    <span className="text-slate-500 text-xs">({item.productSku})</span>
                    <span className="text-slate-300 text-xs">{item.rackLocation || "Receiving"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 p-6 pt-0 overflow-auto">
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            {[
              { label: 'Racks', value: zoneStats?.totalRacks || 0, color: 'text-white' },
              { label: 'Utilization', value: zoneStats?.totalCapacity ? Math.round((zoneStats.totalLoad / zoneStats.totalCapacity) * 100) + '%' : '0%', color: 'text-white' },
              { label: 'Filled', value: zoneStats?.occupiedBins || 0, color: 'text-cyan-400' },
              { label: 'Empty', value: zoneStats?.emptyBins || 0, color: 'text-green-400' },
              { label: 'Units', value: zoneStats?.totalLoad || 0, color: 'text-white' }
            ].map((stat, i) => (
              <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="text-slate-400 text-sm">{stat.label}</div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-[32px] border border-slate-800/80 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" style={{ background: `linear-gradient(180deg, ${zoneColor.light} 0%, #0f172a 100%)` }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: zoneColor.bg }} />
                <h2 className="text-2xl font-bold text-white">{selectedZone?.name}</h2>
                <span className="text-slate-400">{selectedZone?.racks.length} racks</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {selectedZone?.racks.map((rack) => (
                <RackCard
                  key={rack.rackCode}
                  rack={rack}
                  zoneColor={zoneColor}
                  highlightedBins={highlightedBins}
                />
              ))}
              {selectedZone?.racks.length === 0 && (
                <div className="col-span-full text-center py-16 text-slate-400 text-xl">
                  No racks in this zone
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-wrap items-center justify-center gap-8 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-emerald-500 bg-emerald-950/80 text-[10px] font-bold text-emerald-400">+</div>
              <span className="text-slate-300">Empty</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-cyan-300 bg-gradient-to-br from-cyan-400 to-cyan-700 text-[10px] font-black text-white">12</div>
              <span className="text-slate-300">Filled</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-amber-300 bg-gradient-to-br from-amber-300 to-amber-500 text-[10px] font-black text-slate-900">12</div>
              <span className="text-slate-300">Search Match</span>
            </div>
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  )
}
