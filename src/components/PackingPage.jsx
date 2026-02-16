import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { PackageCheck, Scale, ScanLine, Printer } from "lucide-react";
const API_URL = "http://localhost:5000/api";
export function PackingPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [packByOrder, setPackByOrder] = useState({});
    const [toteScan, setToteScan] = useState("");
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
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const packQueue = useMemo(() => {
        return orders.filter((order) => order.type !== "inbound" && order.status === "completed");
    }, [orders]);
    const getPackState = (orderId) => {
        return (packByOrder[orderId] || {
            cartonType: "Small",
            weight: "",
            labelPrinted: false,
            packed: false,
        });
    };
    const updatePackState = (orderId, patch) => {
        setPackByOrder((prev) => ({
            ...prev,
            [orderId]: {
                ...getPackState(orderId),
                ...patch,
            },
        }));
    };
    const printLabel = (orderId) => {
        updatePackState(orderId, { labelPrinted: true });
    };
    const completePack = (orderId) => {
        const state = getPackState(orderId);
        if (!state.weight) {
            alert("Enter carton weight before completing pack");
            return;
        }
        if (!state.labelPrinted) {
            alert("Print shipping label before completing pack");
            return;
        }
        updatePackState(orderId, { packed: true });
    };
    if (loading)
        return <div className="p-6">Loading packing queue...</div>;
    return (<div className="p-6 space-y-6 h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1>Packing</h1>
          <p className="text-muted-foreground">Pack picked waves and generate outbound shipping labels</p>
        </div>
        <Badge variant="secondary">Orders To Pack: {packQueue.length}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Packing Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wave/Order</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Carton</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packQueue.map((order) => {
            const state = getPackState(order.id);
            return (<TableRow key={order.id}>
                    <TableCell className="font-mono">{order.orderNumber}</TableCell>
                    <TableCell>{order.customer?.name || "Store/Account"}</TableCell>
                    <TableCell>{state.cartonType}</TableCell>
                    <TableCell>{state.weight || "-"}</TableCell>
                    <TableCell>{state.labelPrinted ? "Printed" : "Pending"}</TableCell>
                    <TableCell>
                      {state.packed ? <Badge>Packed</Badge> : <Badge variant="secondary">Packing</Badge>}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Open Station
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Pack Station - {order.orderNumber}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Scan Tote / Order</Label>
                              <div className="relative">
                                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                <Input className="pl-10" placeholder="TOTE-1008" value={toteScan} onChange={(e) => setToteScan(e.target.value)}/>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Carton Type</Label>
                                <Input value={getPackState(order.id).cartonType} onChange={(e) => updatePackState(order.id, { cartonType: e.target.value || "Small" })}/>
                              </div>
                              <div>
                                <Label>Weight (kg)</Label>
                                <div className="relative">
                                  <Scale className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                  <Input className="pl-10" placeholder="0.00" value={getPackState(order.id).weight} onChange={(e) => updatePackState(order.id, { weight: e.target.value })}/>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => printLabel(order.id)}>
                                <Printer className="h-4 w-4 mr-2"/>
                                Print Label
                              </Button>
                              <Button onClick={() => completePack(order.id)}>
                                <PackageCheck className="h-4 w-4 mr-2"/>
                                Pack Complete
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>);
        })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>);
}
