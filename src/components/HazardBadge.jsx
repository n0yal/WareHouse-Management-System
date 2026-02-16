import { Badge } from "./ui/badge"
import { Flame, FlaskConical, Package, GlassWater } from "lucide-react"

const STYLES = {
  INFLAMMABLE: { className: "bg-red-100 text-red-800 border-red-200", Icon: Flame },
  TOXIC: { className: "bg-yellow-100 text-yellow-800 border-yellow-200", Icon: FlaskConical },
  FRAGILE: { className: "bg-orange-100 text-orange-800 border-orange-200", Icon: GlassWater },
  NORMAL: { className: "bg-green-100 text-green-800 border-green-200", Icon: Package },
}

export function HazardBadge({ classification }) {
  const value = String(classification || "NORMAL").toUpperCase()
  const safe = STYLES[value] ? value : "NORMAL"
  const { className, Icon } = STYLES[safe]
  return (
    <Badge className={className}>
      <Icon className="h-3.5 w-3.5 mr-1" />
      {safe}
    </Badge>
  )
}
