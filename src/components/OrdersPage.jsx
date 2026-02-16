import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Plus, Search, Filter, Eye, Edit, ShoppingCart } from "lucide-react";
const API_URL = 'http://localhost:5000/api';
export function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    useEffect(() => {
        fetchOrders();
    }, []);
    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/orders`);
            const data = await res.json();
            setOrders(data);
        }
        catch (err) {
            console.error('Failed to fetch orders:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    const getStatusBadge = (status) => {
        switch (status) {
            case "pending":
                return <Badge variant="outline">Pending</Badge>;
            case "processing":
                return <Badge variant="secondary">Processing</Badge>;
            case "completed":
                return <Badge>Completed</Badge>;
            case "cancelled":
                return <Badge variant="destructive">Cancelled</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };
    const getTypeBadge = (type) => {
        return type === 'inbound' ? <Badge>Inbound</Badge> : <Badge variant="default">Outbound</Badge>;
    };
    if (loading)
        return <div className="p-6">Loading orders...</div>;
    return (<div className="p-6 space-y-6 h-full overflow-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1>Order Management</h1>
          <p className="text-muted-foreground">Track and manage wholesale orders</p>
        </div>
        
        <Button>
          <Plus className="h-4 w-4 mr-2"/>
          New Order
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl">{orders.length}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-muted-foreground"/>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5"/>
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                <Input placeholder="Search orders or customers..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Status"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (<TableRow key={order.id}>
                  <TableCell className="font-mono">{order.orderNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.customer?.name || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">{order.customer?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(order.type)}</TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>${order.totalAmount?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                            <Eye className="h-4 w-4"/>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Order Details - {selectedOrder?.orderNumber}</DialogTitle>
                            <DialogDescription>
                              Complete order information and items
                            </DialogDescription>
                          </DialogHeader>
                          {selectedOrder && (<Tabs defaultValue="details" className="w-full">
                              <TabsList>
                                <TabsTrigger value="details">Order Details</TabsTrigger>
                                <TabsTrigger value="items">Items</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="details" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4>Customer Information</h4>
                                    <p>{selectedOrder.customer?.name}</p>
                                    <p className="text-sm text-muted-foreground">{selectedOrder.customer?.email}</p>
                                  </div>
                                  <div>
                                    <h4>Order Summary</h4>
                                    <p>Total: ${selectedOrder.totalAmount?.toFixed(2)}</p>
                                    <p>Type: {selectedOrder.type}</p>
                                    <p>Date: {new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                {selectedOrder.notes && (<div>
                                    <h4>Notes</h4>
                                    <p>{selectedOrder.notes}</p>
                                  </div>)}
                              </TabsContent>
                              
                              <TabsContent value="items">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Product</TableHead>
                                      <TableHead>Quantity</TableHead>
                                      <TableHead>Price</TableHead>
                                      <TableHead>Total</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {selectedOrder.orderItems?.map((item) => (<TableRow key={item.id}>
                                        <TableCell>{item.product?.name || 'N/A'}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>${item.unitPrice?.toFixed(2) || '0.00'}</TableCell>
                                        <TableCell>${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}</TableCell>
                                      </TableRow>))}
                                  </TableBody>
                                </Table>
                              </TabsContent>
                            </Tabs>)}
                        </DialogContent>
                      </Dialog>
                      
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4"/>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>);
}
