import { useState } from "react";
import { User, Mail, Phone, MapPin, Shield, Bell, Lock, LogOut, Mic, Camera, Play, Image as ImageIcon, Calendar, Clock } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar } from "./ui/avatar";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface UserProfileProps {
  onLogout: () => void;
  alertsEvidence?: Array<{
    id: number;
    date: Date;
    duration: string;
    location: string;
    evidence: Array<{ audio: string; photo: string; timestamp: Date }>;
  }>;
}

export function UserProfile({ onLogout, alertsEvidence = [] }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "Almaz Derese",
    email: "almiderese@example.com",
    phone: "+251 95 987 6543",
    location: "Addis Ababa, AA"
  });

  const [settings, setSettings] = useState({
    notifications: true,
    locationSharing: true,
    emergencyAlerts: true,
    safetyReminders: false
  });

  // Mock data for demonstration
  const mockEvidence = alertsEvidence.length > 0 ? alertsEvidence : [
    {
      id: 1,
      date: new Date(2026, 0, 2, 14, 30),
      duration: "2:45",
      location: "Ras Mekonen Ave",
      evidence: [
        { audio: "audio_1735834200000.webm", photo: "photo_1735834200000.jpg", timestamp: new Date(2026, 0, 2, 14, 30) },
        { audio: "audio_1735834230000.webm", photo: "photo_1735834230000.jpg", timestamp: new Date(2026, 0, 2, 14, 30, 30) },
        { audio: "audio_1735834260000.webm", photo: "photo_1735834260000.jpg", timestamp: new Date(2026, 0, 2, 14, 31) },
      ]
    },
    {
      id: 2,
      date: new Date(2025, 11, 28, 19, 15),
      duration: "1:30",
      location: "Meskel Square",
      evidence: [
        { audio: "audio_1735416900000.webm", photo: "photo_1735416900000.jpg", timestamp: new Date(2025, 11, 28, 19, 15) },
        { audio: "audio_1735416930000.webm", photo: "photo_1735416930000.jpg", timestamp: new Date(2025, 11, 28, 19, 15, 30) },
      ]
    },
  ];

  const handleSave = () => {
    setIsEditing(false);
    // In a real app, this would save to backend
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="p-4 space-y-6 pb-20">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="evidence">
            Alert Evidence
            {mockEvidence.length > 0 && (
              <Badge className="ml-2 size-5 flex items-center justify-center p-0 text-xs">
                {mockEvidence.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-6">
          {/* Profile Header */}
          <Card className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="size-24">
                <div className="size-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-3xl">
                  {profile.name.split(' ').map(n => n[0]).join('')}
                </div>
              </Avatar>
              <div>
                <h2>{profile.name}</h2>
                <p className="text-muted-foreground">{profile.email}</p>
              </div>
              <Button 
                variant={isEditing ? "default" : "outline"}
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              >
                {isEditing ? "Save Changes" : "Edit Profile"}
              </Button>
            </div>
          </Card>

          {/* Profile Information */}
          <Card className="p-4">
            <h3 className="mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  {isEditing ? (
                    <Input 
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="flex-1"
                    />
                  ) : (
                    <span className="flex-1">{profile.name}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  {isEditing ? (
                    <Input 
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="flex-1"
                    />
                  ) : (
                    <span className="flex-1">{profile.email}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phone Number</Label>
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" />
                  {isEditing ? (
                    <Input 
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="flex-1"
                    />
                  ) : (
                    <span className="flex-1">{profile.phone}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  {isEditing ? (
                    <Input 
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      className="flex-1"
                    />
                  ) : (
                    <span className="flex-1">{profile.location}</span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Safety Settings */}
          <Card className="p-4">
            <h3 className="mb-4">Safety Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="size-5 text-blue-600" />
                  <div>
                    <p>Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive safety alerts</p>
                  </div>
                </div>
                <Switch 
                  checked={settings.notifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, notifications: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="size-5 text-green-600" />
                  <div>
                    <p>Location Services</p>
                    <p className="text-sm text-muted-foreground">Share your location</p>
                  </div>
                </div>
                <Switch 
                  checked={settings.locationSharing}
                  onCheckedChange={(checked) => setSettings({ ...settings, locationSharing: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="size-5 text-red-600" />
                  <div>
                    <p>Emergency Alerts</p>
                    <p className="text-sm text-muted-foreground">Critical safety warnings</p>
                  </div>
                </div>
                <Switch 
                  checked={settings.emergencyAlerts}
                  onCheckedChange={(checked) => setSettings({ ...settings, emergencyAlerts: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="size-5 text-orange-600" />
                  <div>
                    <p>Safety Reminders</p>
                    <p className="text-sm text-muted-foreground">Periodic safety tips</p>
                  </div>
                </div>
                <Switch 
                  checked={settings.safetyReminders}
                  onCheckedChange={(checked) => setSettings({ ...settings, safetyReminders: checked })}
                />
              </div>
            </div>
          </Card>

          {/* Account Actions */}
          <Card className="p-4">
            <h3 className="mb-4">Account</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Lock className="size-4 mr-2" />
                Change Password
              </Button>
              <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
                <LogOut className="size-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </Card>

          {/* Account Stats */}
          <Card className="p-4">
            <h3 className="mb-4">Your Safety Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl text-blue-600">47</div>
                <p className="text-sm text-muted-foreground">Trips Tracked</p>
              </div>
              <div className="text-center">
                <div className="text-2xl text-green-600">156</div>
                <p className="text-sm text-muted-foreground">Safe Miles</p>
              </div>
              <div className="text-center">
                <div className="text-2xl text-purple-600">23</div>
                <p className="text-sm text-muted-foreground">Alerts Received</p>
              </div>
              <div className="text-center">
                <div className="text-2xl text-red-600">{mockEvidence.length}</div>
                <p className="text-sm text-muted-foreground">SOS Used</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4 mt-6">
          <div>
            <h3>Previous Alert Evidence</h3>
            <p className="text-sm text-muted-foreground">
              Audio and photo evidence from your emergency alerts
            </p>
          </div>

          {mockEvidence.length === 0 ? (
            <Card className="p-8 text-center">
              <Shield className="size-12 mx-auto text-muted-foreground mb-3" />
              <h4>No Evidence Recorded</h4>
              <p className="text-sm text-muted-foreground mt-2">
                Evidence will be automatically recorded when you trigger an SOS alert
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {mockEvidence.map((alert) => (
                <Card key={alert.id} className="p-4">
                  <div className="space-y-4">
                    {/* Alert Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="size-4 text-red-600" />
                          <h4>Emergency Alert</h4>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="size-3" />
                            {formatDate(alert.date)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="size-3" />
                            Duration: {alert.duration}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="size-3" />
                            {alert.location}
                          </div>
                        </div>
                      </div>
                      <Badge variant="destructive">
                        {alert.evidence.length} items
                      </Badge>
                    </div>

                    <Separator />

                    {/* Evidence Items */}
                    <div className="space-y-2">
                      <h4 className="text-sm">Recorded Evidence</h4>
                      {alert.evidence.map((item, index) => (
                        <div key={index} className="grid grid-cols-2 gap-2">
                          {/* Audio Card */}
                          <Card className="p-3 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
                            <div className="flex items-center gap-2 mb-2">
                              <Mic className="size-4 text-purple-600" />
                              <span className="text-xs">Audio {index + 1}</span>
                            </div>
                            <Button size="sm" variant="outline" className="w-full text-xs">
                              <Play className="size-3 mr-1" />
                              Play
                            </Button>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.timestamp.toLocaleTimeString()}
                            </p>
                          </Card>

                          {/* Photo Card */}
                          <Card className="p-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 mb-2">
                              <Camera className="size-4 text-blue-600" />
                              <span className="text-xs">Photo {index + 1}</span>
                            </div>
                            <Button size="sm" variant="outline" className="w-full text-xs">
                              <ImageIcon className="size-3 mr-1" />
                              View
                            </Button>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.timestamp.toLocaleTimeString()}
                            </p>
                          </Card>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        Download All
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        Share
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Info Card */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <h4 className="mb-2">About Evidence Recording</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Audio is recorded every 30 seconds during SOS</li>
              <li>• Photos are captured every 30 seconds</li>
              <li>• All evidence is securely stored</li>
              <li>• Evidence can be shared with authorities</li>
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}