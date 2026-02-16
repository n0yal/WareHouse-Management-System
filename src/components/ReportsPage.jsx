import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, } from "recharts";
import { Download, Clock3, Target, Truck, Boxes, AlertTriangle } from "lucide-react";
const throughputByHour = [
    { hour: "06", received: 34, picked: 25, shipped: 18 },
    { hour: "08", received: 58, picked: 42, shipped: 33 },
    { hour: "10", received: 76, picked: 65, shipped: 52 },
    { hour: "12", received: 70, picked: 74, shipped: 63 },
    { hour: "14", received: 62, picked: 79, shipped: 71 },
    { hour: "16", received: 49, picked: 66, shipped: 68 },
];
const backlogTrend = [
    { day: "Mon", receiving: 24, picking: 41, shipping: 17 },
    { day: "Tue", receiving: 21, picking: 36, shipping: 15 },
    { day: "Wed", receiving: 19, picking: 34, shipping: 14 },
    { day: "Thu", receiving: 17, picking: 29, shipping: 12 },
    { day: "Fri", receiving: 16, picking: 26, shipping: 11 },
    { day: "Sat", receiving: 13, picking: 22, shipping: 9 },
];
const exceptionByType = [
    { type: "Short Pick", value: 31, color: "#f97316" },
    { type: "Receiving Variance", value: 27, color: "#ef4444" },
    { type: "Damaged", value: 18, color: "#eab308" },
    { type: "Label Mismatch", value: 14, color: "#3b82f6" },
    { type: "Blocked Location", value: 10, color: "#8b5cf6" },
];
const laborProductivity = [
    { shift: "Shift A", linesPerHour: 148 },
    { shift: "Shift B", linesPerHour: 132 },
    { shift: "Shift C", linesPerHour: 119 },
];
export function ReportsPage() {
    return (<div className="p-6 space-y-6 h-full overflow-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1>Warehouse Reports</h1>
          <p className="text-muted-foreground">Operational performance, throughput, and exception analytics</p>
        </div>

        <div className="flex gap-2">
          <Select defaultValue="7days">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button>
            <Download className="h-4 w-4 mr-2"/>
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Dock-To-Stock Time</CardTitle>
            <Clock3 className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">97 min</div>
            <p className="text-xs text-green-600">-14 min vs last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Pick Rate</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">136 lines/hr</div>
            <p className="text-xs text-green-600">+8.1% vs last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">On-Time Ship</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">96.4%</div>
            <p className="text-xs text-green-600">+1.2% vs last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Inventory Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">98.1%</div>
            <p className="text-xs text-amber-600">2 unresolved cycle variances</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Throughput By Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={throughputByHour}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="hour"/>
                <YAxis />
                <Bar dataKey="received" fill="#2563eb"/>
                <Bar dataKey="picked" fill="#ca8a04"/>
                <Bar dataKey="shipped" fill="#16a34a"/>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backlog Trend By Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={backlogTrend}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="day"/>
                <YAxis />
                <Line type="monotone" dataKey="receiving" stroke="#3b82f6" strokeWidth={2}/>
                <Line type="monotone" dataKey="picking" stroke="#f59e0b" strokeWidth={2}/>
                <Line type="monotone" dataKey="shipping" stroke="#22c55e" strokeWidth={2}/>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500"/>
              Exception Volume By Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={exceptionByType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value">
                  {exceptionByType.map((entry) => (<Cell key={entry.type} fill={entry.color}/>))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {exceptionByType.map((item) => (<div key={item.type} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}/>
                  <span>
                    {item.type}: {item.value}
                  </span>
                </div>))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Labor Productivity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {laborProductivity.map((row) => (<div key={row.shift} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{row.shift}</span>
                    <span>{row.linesPerHour} lines/hr</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full">
                    <div className="h-2 bg-primary rounded-full" style={{ width: `${Math.min((row.linesPerHour / 160) * 100, 100)}%` }}/>
                  </div>
                </div>))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>);
}
