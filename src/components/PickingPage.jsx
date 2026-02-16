import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ListChecks, ScanLine, Clock3, UserRound } from "lucide-react";
const API_URL = "http://localhost:5000/api";
export function PickingPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrderId, setSelectedOrderId] = useState("");
    const [zoneFilter, setZoneFilter] = useState("all");
    const [binScan, setBinScan] = useState("");
    const [pickedQty, setPickedQty] = useState("1");
    const [shortReason, setShortReason] = useState("");
    const [assignees, setAssignees] = useState({});
    useEffect(() => {
        fetchOrders();
    }, []);
    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/orders`);
            if (!response.ok)
                throw new Error("Failed to fetch orders");
            const data = await response.json();
            setOrders(data);
            if (data.length > 0 && !selectedOrderId) {
                setSelectedOrderId(data[0].id);
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const outboundOrders = useMemo(() => {
        return orders
            .filter((order) => order.type !== "inbound" && order.status !== "shipped")
            .map((order, index) => {
            const taskCount = order.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
            const zone = ["A", "B", "C", "D"][index % 4];
            const priority = taskCount > 25 ? "Critical" : taskCount > 10 ? "High" : "Medium";
            const progress = order.status === "completed" ? 100 : order.status === "processing" ? 55 : 15;
            return {
                ...order,
                zone,
                taskCount,
                priority,
                progress,
            };
        });
    }, [orders]);
    const filteredOrders = outboundOrders.filter((order) => {
        if (zoneFilter === "all")
            return true;
        return order.zone === zoneFilter;
    });
    const selectedOrder = filteredOrders.find((order) => order.id === selectedOrderId) || filteredOrders[0];
    const updateOrderStatus = async (order, status) => {
        const response = await fetch(`${API_URL}/orders/${order.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                orderNumber: order.orderNumber,
                customerId: order.customerId,
                type: order.type,
                status,
                notes: order.notes,
            }),
        });
        if (!response.ok)
            throw new Error("Failed to update order status");
        await fetchOrders();
    };
    const startPicking = async (order) => {
        try {
            await updateOrderStatus(order, "processing");
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Unable to start picking");
        }
    };
    const completePicking = async () => {
        if (!selectedOrder)
            return;
        if (!binScan.trim()) {
            alert("Scan source bin before completing pick");
            return;
        }
        if (Number(pickedQty) <= 0) {
            alert("Picked quantity must be greater than 0");
            return;
        }
        try {
            await updateOrderStatus(selectedOrder, "completed");
            setBinScan("");
            setPickedQty("1");
            setShortReason("");
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Unable to complete picking");
        }
    };
    if (loading)
        return <div className="p-6">Loading picking queue...</div>;
    return (<div className="p-6 space-y-6 h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1>Picking</h1>
          <p className="text-muted-foreground">Release and execute zone-based pick tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Open Tasks: {filteredOrders.length}</Badge>
          <Button onClick={fetchOrders}>Refresh Queue</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pick Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 w-48">
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by zone"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                <SelectItem value="A">Zone A</SelectItem>
                <SelectItem value="B">Zone B</SelectItem>
                <SelectItem value="C">Zone C</SelectItem>
                <SelectItem value="D">Zone D</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wave/Batch</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (<TableRow key={order.id} className={selectedOrder?.id === order.id ? "bg-accent/50" : ""} onClick={() => setSelectedOrderId(order.id)}>
                  <TableCell className="font-mono">{order.orderNumber}</TableCell>
                  <TableCell>{order.zone}</TableCell>
                  <TableCell>{order.taskCount}</TableCell>
                  <TableCell>
                    <Badge variant={order.priority === "Critical" ? "destructive" : "secondary"}>{order.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm flex items-center gap-1">
                      <Clock3 className="h-3 w-3"/>
                      {order.status === "pending" ? "1h 10m" : "38m"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select value={assignees[order.id] || "unassigned"} onValueChange={(value) => setAssignees((prev) => ({ ...prev, [order.id]: value }))}>
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        <SelectItem value="operator-1">Operator 1</SelectItem>
                        <SelectItem value="operator-2">Operator 2</SelectItem>
                        <SelectItem value="operator-3">Operator 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{order.progress}%</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {order.status === "pending" && (<Button size="sm" variant="outline" onClick={() => startPicking(order)}>
                          Start
                        </Button>)}
                    </div>
                  </TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5"/>
            Pick Execution Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedOrder ? (<p className="text-sm text-muted-foreground">Select a pick task to execute.</p>) : (<>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Wave</Label>
                  <Input value={selectedOrder.orderNumber} readOnly className="font-mono"/>
                </div>
                <div>
                  <Label>Destination</Label>
                  <Input value={selectedOrder.customer?.name || "Store/Account"} readOnly/>
                </div>
                <div>
                  <Label>Assigned Picker</Label>
                  <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
                    <UserRound className="h-4 w-4"/>
                    <span className="text-sm">{assignees[selectedOrder.id] || "Unassigned"}</span>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Input value={selectedOrder.status} readOnly/>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Scan Source Bin</Label>
                  <div className="relative">
                    <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                    <Input className="pl-10" placeholder="A-03-02" value={binScan} onChange={(e) => setBinScan(e.target.value)}/>
                  </div>
                </div>
                <div>
                  <Label>Confirm Picked Qty</Label>
                  <Input type="number" min="1" value={pickedQty} onChange={(e) => setPickedQty(e.target.value)}/>
                </div>
                <div>
                  <Label>Short Pick Reason</Label>
                  <Input placeholder="Only if short" value={shortReason} onChange={(e) => setShortReason(e.target.value)}/>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={completePicking}>Complete Pick</Button>
              </div>
            </>)}
        </CardContent>
      </Card>
    </div>);
}
