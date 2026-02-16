import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Plus, Search, Truck, MapPin, Phone, Mail, Edit, Trash2 } from "lucide-react";
const API_URL = 'http://localhost:5000/api';
export function SuppliersPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    useEffect(() => {
        fetchSuppliers();
    }, []);
    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/suppliers`);
            const data = await res.json();
            setSuppliers(data);
        }
        catch (err) {
            console.error('Failed to fetch suppliers:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this supplier?'))
            return;
        try {
            const res = await fetch(`${API_URL}/suppliers/${id}`, { method: 'DELETE' });
            if (!res.ok)
                throw new Error('Failed to delete supplier');
            setSuppliers(suppliers.filter(s => s.id !== id));
        }
        catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete supplier');
        }
    };
    const filteredSuppliers = suppliers.filter(supplier => supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email.toLowerCase().includes(searchTerm.toLowerCase()));
    if (loading)
        return <div className="p-6">Loading suppliers...</div>;
    return (<div className="p-6 space-y-6 h-full overflow-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1>Supplier Management</h1>
          <p className="text-muted-foreground">Manage your wholesale suppliers</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2"/>
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
              <DialogDescription>
                Enter the details for the new supplier.
              </DialogDescription>
            </DialogHeader>
            <SupplierForm onSuccess={() => { fetchSuppliers(); setDialogOpen(false); }}/>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Suppliers</p>
                <p className="text-2xl">{suppliers.length}</p>
              </div>
              <Truck className="h-8 w-8 text-muted-foreground"/>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                <Input placeholder="Search suppliers..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suppliers ({filteredSuppliers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (<TableRow key={supplier.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{supplier.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3"/>
                        {supplier.email}
                      </div>
                      {supplier.phone && (<div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3"/>
                          {supplier.phone}
                        </div>)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {supplier.address && (<div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3 w-3"/>
                        {supplier.address}
                      </div>)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4"/>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(supplier.id)}>
                        <Trash2 className="h-4 w-4"/>
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
function SupplierForm({ onSuccess }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/suppliers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (!res.ok)
                throw new Error('Failed to create supplier');
            onSuccess();
        }
        catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to create supplier');
        }
        finally {
            setSubmitting(false);
        }
    };
    return (<form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name</Label>
            <Input id="name" placeholder="Enter company name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="supplier@company.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required/>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" placeholder="+1 (555) 123-4567" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}/>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" placeholder="Enter full address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}/>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline">Cancel</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Adding...' : 'Add Supplier'}
        </Button>
      </div>
    </form>);
}
