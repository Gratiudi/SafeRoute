import { useState } from "react";
import { MapPin, Navigation, Clock, Shield, AlertTriangle } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

interface Route {
  id: number;
  name: string;
  distance: string;
  duration: string;
  safetyScore: number;
  alerts: number;
  type: "safest" | "fastest" | "shortest";
}

export function SafeNavigation() {
  const [destination, setDestination] = useState("");
  const [showRoutes, setShowRoutes] = useState(false);

  const routes: Route[] = [
    {
      id: 1,
      name: "Main Street Route",
      distance: "3.2 km",
      duration: "12 min",
      safetyScore: 95,
      alerts: 0,
      type: "safest"
    },
    {
      id: 2,
      name: "Highway Route",
      distance: "2.8 km",
      duration: "8 min",
      safetyScore: 78,
      alerts: 2,
      type: "fastest"
    },
    {
      id: 3,
      name: "Scenic Route",
      distance: "2.5 km",
      duration: "15 min",
      safetyScore: 88,
      alerts: 1,
      type: "shortest"
    }
  ];

  const handleSearch = () => {
    if (destination.trim()) {
      setShowRoutes(true);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2>Safe Route Navigation</h2>
        <p className="text-muted-foreground">Find the safest path to your destination</p>
      </div>

      {/* Search Section */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="size-3 rounded-full bg-blue-500" />
            <span>Current Location</span>
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Enter destination..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} className="w-full">
            <Navigation className="size-4 mr-2" />
            Find Safe Routes
          </Button>
        </div>
      </Card>

      {/* Routes List */}
      {showRoutes && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3>Available Routes</h3>
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Shield className="size-3 mr-1" />
              Safe
            </Badge>
          </div>

          {routes.map((route) => (
            <Card 
              key={route.id} 
              className="p-4 cursor-pointer hover:bg-accent transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4>{route.name}</h4>
                      {route.type === "safest" && (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          Safest
                        </Badge>
                      )}
                      {route.type === "fastest" && (
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          Fastest
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Navigation className="size-3" />
                        {route.distance}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {route.duration}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl ${route.safetyScore >= 90 ? 'text-green-600' : route.safetyScore >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {route.safetyScore}%
                    </div>
                    <p className="text-xs text-muted-foreground">Safety</p>
                  </div>
                </div>

                {route.alerts > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                    <AlertTriangle className="size-4 text-yellow-600" />
                    <span className="text-xs text-yellow-700 dark:text-yellow-400">
                      {route.alerts} active alert{route.alerts > 1 ? 's' : ''} on this route
                    </span>
                  </div>
                )}

                <Button className="w-full" size="sm">
                  Start Navigation
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Map Placeholder */}
      {!showRoutes && (
        <Card className="p-8 bg-gray-100 dark:bg-gray-900">
          <div className="text-center space-y-2">
            <MapPin className="size-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Enter a destination to view safe routes</p>
          </div>
        </Card>
      )}
    </div>
  );
}
