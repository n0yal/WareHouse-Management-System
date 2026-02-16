import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Layers3 } from "lucide-react"

const API_URL = "http://localhost:5000/api"

export function RacksPage() {
  const [racks, setRacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    void fetchRacks()
  }, [])

  const fetchRacks = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/racks`)
      if (!res.ok) {
        throw new Error("Failed to fetch racks")
      }
      const data = await res.json()
      setRacks(Array.isArray(data) ? data : [])
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch racks")
    } finally {
      setLoading(false)
    }
  }

  const withUtilization = useMemo(() => {
    return racks.map((rack) => {
      const capacity = Number(rack.capacity) || 0
      const currentLoad = Number(rack.currentLoad) || 0
      const utilization = capacity > 0 ? Math.min(Math.round((currentLoad / capacity) * 100), 100) : 0
      return { ...rack, capacity, currentLoad, utilization }
    })
  }, [racks])

  if (loading) return <div className="p-6">Loading racks...</div>
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <div>
        <h1>Racks</h1>
        <p className="text-muted-foreground">Admin view of rack zones, capacity, and current load</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers3 className="h-5 w-5" />
            Rack Master ({withUtilization.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rack Code</TableHead>
                <TableHead>Zone Type</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Current Load</TableHead>
                <TableHead>Utilization</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withUtilization.map((rack) => (
                <TableRow key={rack.id}>
                  <TableCell className="font-mono">{rack.rackCode}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{rack.zoneType}</Badge>
                  </TableCell>
                  <TableCell>{rack.capacity}</TableCell>
                  <TableCell>{rack.currentLoad}</TableCell>
                  <TableCell>{rack.utilization}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
