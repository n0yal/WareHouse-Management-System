import { LayoutDashboard, Package, ListChecks, PackageCheck, Send, Undo2, ClipboardCheck, Boxes, ScanLine, BarChart3, Settings, Warehouse, Barcode, LogOut, Layers3 } from "lucide-react";
import { cn } from "./ui/utils";
import { Button } from "./ui/button";
const menuItems = [
    { id: "dashboard", label: "Operations Dashboard", icon: LayoutDashboard },
    { id: "products-master", label: "Products", icon: Barcode },
    { id: "inbound", label: "Receiving", icon: ScanLine },
    { id: "putaway", label: "Putaway", icon: Boxes },
    { id: "racks", label: "Racks", icon: Layers3 },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "picking", label: "Picking", icon: ListChecks },
    { id: "packing", label: "Packing", icon: PackageCheck },
    { id: "shipping", label: "Shipping", icon: Send },
    { id: "returns", label: "Returns", icon: Undo2 },
    { id: "cycle-count", label: "Cycle Count", icon: ClipboardCheck },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
];
const STAFF_ALLOWED = new Set(["inbound", "putaway", "inventory", "shipping"]);
export function Sidebar({ activeSection, setActiveSection, className = "", onNavigate, role = "admin", userName = "User", onLogout }) {
    const visibleItems = role === "staff" ? menuItems.filter((item) => STAFF_ALLOWED.has(item.id)) : menuItems;
    return (<div className={cn("w-64 h-full bg-card border-r border-border flex flex-col min-h-0 shrink-0 overflow-y-auto overscroll-contain", className)}>
      {/* Logo/Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <Warehouse className="h-6 w-6 text-primary-foreground"/>
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Warehouse WMS</h1>
            <p className="text-sm text-muted-foreground">DC-01 Operations</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 p-4">
        <ul className="space-y-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (<li key={item.id}>
                <button onClick={() => {
                setActiveSection(item.id);
                if (onNavigate)
                    onNavigate();
            }} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left", activeSection === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                  <Icon className="h-5 w-5"/>
                  {item.label}
                </button>
              </li>);
        })}
        </ul>
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <span className="text-sm">JD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground truncate capitalize">{role}</p>
          </div>
        </div>
        {onLogout && (<Button variant="outline" className="mt-3 w-full justify-start" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2"/>
            Logout
          </Button>)}
      </div>
    </div>);
}
