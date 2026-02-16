import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Label } from "./ui/label"

const USERS = [
  { email: "admin@wms.local", password: "admin123", role: "admin", name: "Warehouse Admin" },
  { email: "staff@wms.local", password: "staff123", role: "staff", name: "Warehouse Staff" },
]

export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    const user = USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password)
    if (!user) {
      setError("Invalid credentials")
      return
    }

    const session = { email: user.email, role: user.role, name: user.name }
    onLogin(session)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Warehouse Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full">Login</Button>
          </form>

          <div className="mt-6 text-xs text-muted-foreground space-y-1">
            <p>Admin: admin@wms.local / admin123</p>
            <p>Staff: staff@wms.local / staff123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
