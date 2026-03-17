import { Shield, MapPin, Users, Bell, AlertTriangle } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

interface DashboardProps {
  onNavigate: (screen: string) => void;
  onEmergency: () => void;
  onMediumSos: () => void;
  userName: string;
}

export function Dashboard({ onNavigate, onEmergency, onMediumSos, userName }: DashboardProps) {
  return (
    <div className="p-4 space-y-6 pb-32">
      {/* Header */}
      <div>
        <h2>Welcome back, Almaz</h2>
        <p className="text-muted-foreground">Stay safe on your journey</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Card 
          className="p-4 cursor-pointer hover:bg-accent transition-colors"
          onClick={() => onNavigate("navigation")}
        >
          <MapPin className="size-8 text-blue-600 dark:text-blue-400 mb-2" />
          <h3>Safe Routes</h3>
          <p className="text-sm text-muted-foreground">Navigate safely</p>
        </Card>

        <Card 
          className="p-4 cursor-pointer hover:bg-accent transition-colors"
          onClick={() => onNavigate("share")}
        >
          <Users className="size-8 text-purple-600 dark:text-purple-400 mb-2" />
          <h3>Share Location</h3>
          <p className="text-sm text-muted-foreground">With contacts</p>
        </Card>

        <Card 
          className="p-4 cursor-pointer hover:bg-accent transition-colors"
          onClick={() => onNavigate("contacts")}
        >
          <Users className="size-8 text-teal-600 dark:text-teal-400 mb-2" />
          <h3>Safe Contacts</h3>
          <p className="text-sm text-muted-foreground">Emergency list</p>
        </Card>

        <Card 
          className="p-4 cursor-pointer hover:bg-accent transition-colors"
          onClick={() => onNavigate("profile")}
        >
          <Shield className="size-8 text-orange-600 dark:text-orange-400 mb-2" />
          <h3>My Profile</h3>
          <p className="text-sm text-muted-foreground">Settings & evidence</p>
        </Card>
      </div>

      {/* Emergency Buttons - Fixed at bottom */}
      <div className="fixed bottom-20 left-0 right-0 px-4 max-w-md mx-auto space-y-2">
        <Button
          className="w-full h-20 bg-red-600 hover:bg-red-700 text-white shadow-lg"
          onClick={onEmergency}
        >
          <ShieldAlert className="size-6 mr-2" />
          EMERGENCY SOS
        </Button>
        
        <Button
          variant="outline"
          className="w-full h-14 border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
          onClick={onMediumSos}
        >
          <AlertTriangle className="size-5 mr-2" />
          I Feel Unsafe
        </Button>
      </div>
    </div>
  );
}

function ShieldAlert({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}