import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Search, Package, X, ChevronLeft, ChevronRight, Layers } from "lucide-react"
import * as Tooltip from "@radix-ui/react-tooltip"

const API_URL = "http://localhost:5000/api"

const ZONE_COLORS = {
  'Receiving': { bg: '#3b82f6', light: '#1e3a5f', border: '#3b82f6' },
  'Storage A': { bg: '#22c55e', light: '#14532d', border: '#22c55e' },
  'Storage B': { bg: '#eab308', light: '#451a03', border: '#eab308' },
  'Storage C': { bg: '#14b8a6', light: '#134e4a', border: '#14b8a6' },
  'Packing': { bg: '#a855f7', light: '#3b0764', border: '#a855f7' },
  'Dispatch': { bg: '#f97316', light: '#431407', border: '#f97316' }
}

function ShelfCell({ isOccupied, isHighlighted, product }) {
  if (isOccupied) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className="cursor-pointer">
            <svg width="40" height="40" viewBox="0 0 40 40" className="transition-transform hover:scale-105">
              <defs>
                <linearGradient id="filledGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={isHighlighted ? "#fbbf24" : "#06b6d4"} />
                  <stop offset="100%" stopColor={isHighlighted ? "#f59e0b" : "#0891b2"} />
                </linearGradient>
                <filter id="filledShadow">
                  <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.3"/>
                </filter>
              </defs>
              <rect x="2" y="2" width="36" height="36" rx="6" fill="url(#filledGrad)" filter="url(#filledShadow)"/>
              <rect x="4" y="4" width="32" height="14" rx="4" fill="white" opacity="0.2"/>
              <path d="M14 20 L20 28 L26 20" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </Tooltip.Trigger>
        {product && (
          <Tooltip.Portal>
            <Tooltip.Content className="bg-slate-900 border border-slate-600 text-white rounded-xl p-4 shadow-2xl z-50" sideOffset={5}>
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
        <div className="cursor-pointer">
          <svg width="40" height="40" viewBox="0 0 40 40" className="transition-transform hover:scale-105">
            <defs>
              <linearGradient id="emptyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#166534" />
                <stop offset="100%" stopColor="#14532d" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="36" height="36" rx="6" fill="url(#emptyGrad)" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 2"/>
            <line x1="10" y1="10" x2="30" y2="30" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
            <line x1="30" y1="10" x2="10" y2="30" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
          </svg>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="bg-slate-800 border border-slate-600 text-white rounded-lg p-2 shadow-xl z-50" sideOffset={5}>
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
    <div className="w-full">
      <svg width="100%" height={numRows * 50 + 30} viewBox={`0 0 180 ${numRows * 50 + 30}`} className="mx-auto">
        <defs>
          <linearGradient id="shelfGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>
          <linearGradient id="shelfEdge" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>
        </defs>
        
        {rows.map((row, rowIdx) => (
          <g key={rowIdx}>
            <rect x="5" y={rowIdx * 50 + 5} width="170" height="8" fill="url(#shelfGrad)" rx="1"/>
            <rect x="5" y={rowIdx * 50 + 13} width="170" height="35" fill="url(#shelfEdge)" rx="2"/>
            
            {row.map((bin, binIdx) => {
              const isHighlighted = highlightedBins.includes(bin.item?.productSku)
              const isOccupied = bin.item && bin.item.quantity > 0
              const xPos = 10 + binIdx * 42
              
              return (
                <g key={binIdx} transform={`translate(${xPos}, ${rowIdx * 50 + 15})`}>
                  <foreignObject width="40" height="40">
                    <div className="w-full h-full flex items-center justify-center">
                      <ShelfCell 
                        isOccupied={isOccupied} 
                        isHighlighted={isHighlighted}
                        product={bin.item}
                      />
                    </div>
                  </foreignObject>
                </g>
              )
            })}
          </g>
        ))}
        
        <rect x="2" y="2" width="6" height={numRows * 50 + 25} fill="#6b7280" rx="2"/>
        <rect x="172" y="2" width="6" height={numRows * 50 + 25} fill="#6b7280" rx="2"/>
      </svg>
    </div>
  )
}

function RackCard({ rack, zoneColor, highlightedBins = [] }) {
  const utilization = rack.utilization
  const isHighUtil = utilization > 85
  const occupiedCount = rack.bins.filter(b => b.item && b.item.quantity > 0).length
  
  return (
    <div 
      className="bg-slate-800 rounded-2xl overflow-hidden hover:ring-2 transition-all cursor-pointer"
      style={{ ringColor: zoneColor.bg }}
    >
      <div className="h-2" style={{ backgroundColor: zoneColor.bg }} />
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-lg text-white">{rack.rackCode}</h3>
            <p className="text-xs text-slate-400">{rack.zone}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: isHighUtil ? '#ef4444' : zoneColor.bg }}>
              {utilization}%
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl p-2 mb-3">
          <RackIcon 
            bins={rack.bins} 
            capacity={rack.capacity}
            highlightedBins={highlightedBins}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span>{occupiedCount} filled</span>
            <span>{rack.capacity - occupiedCount} empty</span>
          </div>
          <span className="text-white font-medium">{rack.currentLoad} units</span>
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
      <div className="h-full flex flex-col bg-slate-950">
        <div className="p-6 pb-4">
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <div className="flex items-center justify-between">
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

              <form onSubmit={handleSearch} className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 w-64"
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

              <div className="flex items-center gap-3">
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
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-medium">Search Results ({searchResults.length})</span>
                <Badge style={{ backgroundColor: zoneColor.bg }}>{searchResults.length} found</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchResults.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg">
                    <Package className="w-4 h-4 text-slate-400" />
                    <span className="text-white text-sm">{item.productName}</span>
                    <span className="text-slate-500 text-xs">({item.productSku})</span>
                    <span className="text-slate-400 text-xs">{item.rackLocation}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 p-6 pt-0 overflow-auto">
          <div className="grid grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Racks', value: zoneStats?.totalRacks || 0, color: 'text-white' },
              { label: 'Utilization', value: zoneStats?.totalCapacity ? Math.round((zoneStats.totalLoad / zoneStats.totalCapacity) * 100) + '%' : '0%', color: 'text-white' },
              { label: 'Filled', value: zoneStats?.occupiedBins || 0, color: 'text-cyan-400' },
              { label: 'Empty', value: zoneStats?.emptyBins || 0, color: 'text-green-400' },
              { label: 'Units', value: zoneStats?.totalLoad || 0, color: 'text-white' }
            ].map((stat, i) => (
              <div key={i} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                <div className="text-slate-400 text-sm">{stat.label}</div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-3xl p-6" style={{ backgroundColor: zoneColor.light }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: zoneColor.bg }} />
                <h2 className="text-2xl font-bold text-white">{selectedZone?.name}</h2>
                <span className="text-slate-400">{selectedZone?.racks.length} racks</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
          <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-center gap-12 border border-slate-800">
            <div className="flex items-center gap-3">
              <svg width="32" height="32" viewBox="0 0 40 40">
                <rect x="2" y="2" width="36" height="36" rx="6" fill="#166534" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 2"/>
                <line x1="10" y1="10" x2="30" y2="30" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
                <line x1="30" y1="10" x2="10" y2="30" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
              </svg>
              <span className="text-slate-300">Empty</span>
            </div>
            <div className="flex items-center gap-3">
              <svg width="32" height="32" viewBox="0 0 40 40">
                <rect x="2" y="2" width="36" height="36" rx="6" fill="url(#filledGrad2)"/>
                <defs>
                  <linearGradient id="filledGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#0891b2" />
                  </linearGradient>
                </defs>
                <rect x="4" y="4" width="32" height="14" rx="4" fill="white" opacity="0.2"/>
                <path d="M14 20 L20 28 L26 20" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-slate-300">Filled</span>
            </div>
            <div className="flex items-center gap-3">
              <svg width="32" height="32" viewBox="0 0 40 40">
                <rect x="2" y="2" width="36" height="36" rx="6" fill="#fbbf24"/>
                <rect x="4" y="4" width="32" height="14" rx="4" fill="white" opacity="0.3"/>
                <path d="M14 20 L20 28 L26 20" stroke="#78350f" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-slate-300">Search Match</span>
            </div>
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  )
}
