import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Label } from "./ui/label"
import { Plus, Search, Barcode, Trash2 } from "lucide-react"

const API_URL = "http://localhost:5000/api"

export function ProductMasterPage() {
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState("")

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/products`)
      const data = await res.json()
      setProducts(data)
    } catch (err) {
      console.error("Failed to fetch products:", err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = products.filter((p) => {
    const eanOrSku = (p.ean || p.sku || "").toLowerCase()
    const q = searchTerm.toLowerCase()
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q) ||
      eanOrSku.includes(q)
    )
  })

  if (loading) return <div className="p-6">Loading products...</div>

  const handleDeleteProduct = async (product) => {
    const confirmed = window.confirm(`Delete product "${product.name}"? This cannot be undone.`)
    if (!confirmed) return

    try {
      setDeletingId(product.id)
      const res = await fetch(`${API_URL}/products/${product.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to delete product")
      }

      await fetchProducts()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete product")
    } finally {
      setDeletingId("")
    }
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1>Products Master</h1>
          <p className="text-muted-foreground">Master item catalog used for EAN validation during receiving</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Product Master</DialogTitle>
              <DialogDescription>Create item used for EAN/SKU checks in receiving.</DialogDescription>
            </DialogHeader>
            <ProductForm onSuccess={fetchProducts} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search by name, SKU, or EAN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            Products ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>EAN</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Min Stock</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="font-mono">{p.ean || p.sku}</TableCell>
                  <TableCell className="font-mono">{p.sku}</TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell>{p.minStockLevel}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteProduct(p)}
                      disabled={deletingId === p.id}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {deletingId === p.id ? "Deleting..." : "Delete"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function ProductForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    ean: "",
    sku: "",
    category: "General",
    price: "0",
    minStockLevel: "1",
    description: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        ...formData,
      }

      const res = await fetch(`${API_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to create product")
      }

      onSuccess()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create product")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Product Name</Label>
          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>EAN</Label>
          <Input value={formData.ean} onChange={(e) => setFormData({ ...formData, ean: e.target.value })} required />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>SKU</Label>
          <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Min Stock</Label>
          <Input type="number" value={formData.minStockLevel} onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Product"}</Button>
      </div>
    </form>
  )
}
