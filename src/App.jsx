import { useEffect, useState } from "react";
import { Menu, Warehouse, X } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { ProductsPage } from "./components/ProductsPage";
import { ReportsPage } from "./components/ReportsPage";
import { SettingsPage } from "./components/SettingsPage";
import { InboundPage } from "./components/InboundPage";
import { PutawayPage } from "./components/PutawayPage";
import { PickingPage } from "./components/PickingPage";
import { PackingPage } from "./components/PackingPage";
import { ShippingPage } from "./components/ShippingPage";
import { ReturnsPage } from "./components/ReturnsPage";
import { CycleCountPage } from "./components/CycleCountPage";
import { ProductMasterPage } from "./components/ProductMasterPage";
import { RacksPage } from "./components/RacksPage";
import { Button } from "./components/ui/button";
import { LoginPage } from "./components/LoginPage";

const ACCESS = {
    admin: [
        "dashboard",
        "inbound",
        "products-master",
        "putaway",
        "racks",
        "inventory",
        "picking",
        "packing",
        "shipping",
        "returns",
        "cycle-count",
        "reports",
        "settings",
    ],
    staff: ["inbound", "putaway", "inventory", "shipping"],
};
export default function App() {
    const [activeSection, setActiveSection] = useState("dashboard");
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [user, setUser] = useState(() => {
        try {
            const raw = localStorage.getItem("wms_user");
            return raw ? JSON.parse(raw) : null;
        }
        catch {
            return null;
        }
    });
    const role = user?.role || "staff";
    const allowedSections = ACCESS[role] || ACCESS.staff;
    useEffect(() => {
        if (!allowedSections.includes(activeSection)) {
            setActiveSection(allowedSections[0]);
        }
    }, [activeSection, allowedSections]);
    const handleLogin = (session) => {
        setUser(session);
        localStorage.setItem("wms_user", JSON.stringify(session));
        const firstSection = (ACCESS[session.role] || ACCESS.staff)[0];
        setActiveSection(firstSection);
    };
    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem("wms_user");
        setMobileNavOpen(false);
        setActiveSection("dashboard");
    };
    const renderContent = () => {
        if (!allowedSections.includes(activeSection)) {
            return <InboundPage />;
        }
        switch (activeSection) {
            case "dashboard":
                return <Dashboard />;
            case "inventory":
                return <ProductsPage role={role}/>;
            case "products-master":
                return <ProductMasterPage />;
            case "inbound":
                return <InboundPage />;
            case "putaway":
                return <PutawayPage />;
            case "racks":
                return <RacksPage />;
            case "picking":
                return <PickingPage />;
            case "packing":
                return <PackingPage />;
            case "shipping":
                return <ShippingPage />;
            case "returns":
                return <ReturnsPage />;
            case "cycle-count":
                return <CycleCountPage />;
            case "reports":
                return <ReportsPage />;
            case "settings":
                return <SettingsPage />;
            default:
                return <Dashboard />;
        }
    };
    if (!user) {
        return <LoginPage onLogin={handleLogin}/>;
    }
    return (<div className="h-screen bg-background overflow-hidden">
      <div className="flex h-full min-h-0">
        <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} className="!hidden md:!flex" role={role} userName={user.name} onLogout={handleLogout}/>
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <header className="h-14 border-b border-border px-4 flex items-center justify-between shrink-0 md:hidden">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-primary rounded-md">
                <Warehouse className="h-4 w-4 text-primary-foreground"/>
              </div>
              <p className="font-medium text-sm truncate">Warehouse WMS</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {mobileNavOpen ? <X className="h-4 w-4"/> : <Menu className="h-4 w-4"/>}
            </Button>
          </header>
          {mobileNavOpen && (<div className="fixed inset-0 z-50 md:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)}/>
              <div className="absolute left-0 top-0 h-full w-[280px] bg-background">
                <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} className="w-full border-r-0" onNavigate={() => setMobileNavOpen(false)} role={role} userName={user.name} onLogout={handleLogout}/>
              </div>
            </div>)}
          <main className="flex-1 overflow-hidden">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>);
}
