import { useState, useEffect } from "react";
import { Shield, MapPin, Share2, Users, User, Menu } from "lucide-react";
import { LandingPage } from "./components/LandingPage";
import { SignUp } from "./components/SignUp";
import { Login } from "./components/Login";
import { OTPVerification } from "./components/OTPVerification";
import { EmergencyContactSetup } from "./components/EmergencyContactSetup";
import { Dashboard } from "./components/Dashboard";
import { SafeNavigation } from "./components/SafeNavigation";
import { LocationSharing } from "./components/LocationSharing";
import { EmergencyContacts } from "./components/EmergencyContacts";
import { UserProfile } from "./components/UserProfile";
import { EmergencyDialog } from "./components/EmergencyDialog";
import { MediumSosDialog } from "./components/MediumSosDialog";
import { Button } from "./components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./components/ui/sheet";

type Screen = "dashboard" | "navigation" | "share" | "contacts" | "profile";
type AuthScreen = "landing" | "signup" | "login" | "otp" | "contactSetup" | "app";

interface AlertEvidence {
  id: number;
  date: Date;
  duration: string;
  location: string;
  evidence: Array<{ audio: string; photo: string; timestamp: Date }>;
}

interface UserData {
  name: string;
  contact: string;
  contactType?: 'email' | 'phone';
  password?: string;
}

export default function App() {
  const [authScreen, setAuthScreen] = useState<AuthScreen>("landing");
  const [currentScreen, setCurrentScreen] = useState<Screen>("dashboard");
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isMediumSosOpen, setIsMediumSosOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [alertsEvidence, setAlertsEvidence] = useState<AlertEvidence[]>([]);
  const [emergencyStartTime, setEmergencyStartTime] = useState<Date | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [tempSignUpData, setTempSignUpData] = useState<UserData | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const currentUser = localStorage.getItem('safetravel_current_user');
    if (currentUser) {
      const user = JSON.parse(currentUser);
      setUserData(user);
      setAuthScreen("app");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('safetravel_current_user');
    setUserData(null);
    setAuthScreen("landing");
    setCurrentScreen("dashboard");
  };

  const handleSignUpComplete = (signUpData: UserData) => {
    setTempSignUpData(signUpData);
    setAuthScreen("otp");
  };

  const handleOTPVerified = () => {
    if (tempSignUpData) {
      // Save user to localStorage
      const users = JSON.parse(localStorage.getItem('safetravel_users') || '[]');
      users.push(tempSignUpData);
      localStorage.setItem('safetravel_users', JSON.stringify(users));
      
      setUserData({ name: tempSignUpData.name, contact: tempSignUpData.contact });
      setAuthScreen("contactSetup");
    }
  };

  const handleContactSetupComplete = () => {
    if (userData) {
      localStorage.setItem('safetravel_current_user', JSON.stringify(userData));
      setAuthScreen("app");
    }
  };

  const handleContactSetupSkip = () => {
    if (userData) {
      localStorage.setItem('safetravel_current_user', JSON.stringify(userData));
      setAuthScreen("app");
    }
  };

  const handleLoginSuccess = (loginUserData: UserData) => {
    setUserData(loginUserData);
    setAuthScreen("app");
  };

  const handleEmergencyOpen = () => {
    setEmergencyStartTime(new Date());
    setIsEmergencyOpen(true);
  };

  const handleMediumSosOpen = () => {
    setIsMediumSosOpen(true);
  };

  const handleEvidenceRecorded = (evidence: Array<{ audio: string; photo: string; timestamp: Date }>) => {
    if (emergencyStartTime && evidence.length > 0) {
      const endTime = new Date();
      const durationMs = endTime.getTime() - emergencyStartTime.getTime();
      const durationMin = Math.floor(durationMs / 60000);
      const durationSec = Math.floor((durationMs % 60000) / 1000);
      
      const newAlert: AlertEvidence = {
        id: Date.now(),
        date: emergencyStartTime,
        duration: `${durationMin}:${durationSec.toString().padStart(2, '0')}`,
        location: "Current Location", // In a real app, this would use actual location
        evidence: evidence
      };
      
      setAlertsEvidence([newAlert, ...alertsEvidence]);
      setEmergencyStartTime(null);
    }
  };

  const navigation = [
    { id: "dashboard" as Screen, label: "Home", icon: Shield },
    { id: "navigation" as Screen, label: "Routes", icon: MapPin },
    { id: "share" as Screen, label: "Share", icon: Share2 },
    { id: "contacts" as Screen, label: "Contacts", icon: Users },
    { id: "profile" as Screen, label: "Profile", icon: User },
  ];

  // Bottom navigation - replacing Share with Profile
  const bottomNavigation = [
    { id: "dashboard" as Screen, label: "Home", icon: Shield },
    { id: "navigation" as Screen, label: "Routes", icon: MapPin },
    { id: "contacts" as Screen, label: "Contacts", icon: Users },
    { id: "profile" as Screen, label: "Profile", icon: User },
  ];

  const renderScreen = () => {
    switch (currentScreen) {
      case "dashboard":
        return (
          <Dashboard
            onNavigate={setCurrentScreen}
            onEmergency={handleEmergencyOpen}
            onMediumSos={handleMediumSosOpen}
            userName={userData?.name || "Alex"}
          />
        );
      case "navigation":
        return <SafeNavigation />;
      case "share":
        return <LocationSharing />;
      case "contacts":
        return <EmergencyContacts />;
      case "profile":
        return <UserProfile onLogout={handleLogout} alertsEvidence={alertsEvidence} />;
      default:
        return (
          <Dashboard
            onNavigate={setCurrentScreen}
            onEmergency={handleEmergencyOpen}
            onMediumSos={handleMediumSosOpen}
            userName={userData?.name || "Alex"}
          />
        );
    }
  };

  const getScreenTitle = () => {
    const screen = navigation.find(nav => nav.id === currentScreen);
    return screen?.label || "SafeTravel";
  };

  // Render authentication screens
  if (authScreen === "landing") {
    return (
      <LandingPage
        onLogin={() => setAuthScreen("login")}
        onSignUp={() => setAuthScreen("signup")}
      />
    );
  }

  if (authScreen === "signup") {
    return (
      <SignUp
        onBack={() => setAuthScreen("landing")}
        onSignUpComplete={handleSignUpComplete}
      />
    );
  }

  if (authScreen === "login") {
    return (
      <Login
        onBack={() => setAuthScreen("landing")}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (authScreen === "otp" && tempSignUpData) {
    return (
      <OTPVerification
        contactType={tempSignUpData.contactType!}
        contact={tempSignUpData.contact}
        onBack={() => setAuthScreen("signup")}
        onVerified={handleOTPVerified}
      />
    );
  }

  if (authScreen === "contactSetup" && userData) {
    return (
      <EmergencyContactSetup
        userName={userData.name}
        onComplete={handleContactSetupComplete}
        onSkip={handleContactSetupSkip}
      />
    );
  }

  // Render main app (authScreen === "app")
  return (
    <div className="size-full flex flex-col bg-background max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <div className="py-6">
                  <div className="flex items-center gap-2 px-2 mb-6">
                    <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <Shield className="size-6 text-white" />
                    </div>
                    <div>
                      <h3>SafeTravel</h3>
                      <p className="text-sm text-muted-foreground">Stay Protected</p>
                    </div>
                  </div>
                  
                  <nav className="space-y-1">
                    {navigation.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setCurrentScreen(item.id);
                            setIsSidebarOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                            currentScreen === item.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-accent"
                          }`}
                        >
                          <Icon className="size-5" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Shield className="size-4 text-white" />
              </div>
              <h1>{getScreenTitle()}</h1>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleEmergencyOpen}
          >
            <Shield className="size-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {renderScreen()}
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 bg-background border-t">
        <div className="flex items-center justify-around py-2 px-2">
          {bottomNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentScreen(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`size-5 ${isActive ? "fill-current" : ""}`} />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Emergency Dialog */}
      <EmergencyDialog
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        onEvidenceRecorded={handleEvidenceRecorded}
      />

      {/* Medium SOS Dialog */}
      <MediumSosDialog
        isOpen={isMediumSosOpen}
        onClose={() => setIsMediumSosOpen(false)}
        onEscalateToFullSos={handleEmergencyOpen}
      />
    </div>
  );
}