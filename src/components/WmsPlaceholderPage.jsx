import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
export function WmsPlaceholderPage({ title, subtitle, primaryAction, queueLabel, queueCount, }) {
    return (<div className="p-6 space-y-6 h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1>{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <Button>{primaryAction}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{queueLabel}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-semibold">{queueCount}</p>
            <Badge variant="secondary">Live Queue</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Worklist</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This screen is scaffolded for Phase 2 workflow implementation.
          </p>
        </CardContent>
      </Card>
    </div>);
}
