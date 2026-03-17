import { useState } from "react";
import { Share2, MapPin, Clock, Users, X } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";

interface Contact {
  id: number;
  name: string;
  email: string;
  isSharing: boolean;
  lastUpdate?: string;
}

export function LocationSharing() {
  const [isLiveSharing, setIsLiveSharing] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([
    { id: 1, name: "Mom", email: "mom@example.com", isSharing: false },
    { id: 2, name: "Dad", email: "dad@example.com", isSharing: false },
    { id: 3, name: "Sarah (Best Friend)", email: "sarah@example.com", isSharing: true, lastUpdate: "2 min ago" },
    { id: 4, name: "Emergency Contact", email: "emergency@example.com", isSharing: false },
  ]);

  const toggleContactSharing = (contactId: number) => {
    setContacts(contacts.map(contact =>
      contact.id === contactId
        ? { ...contact, isSharing: !contact.isSharing, lastUpdate: contact.isSharing ? undefined : "Just now" }
        : contact
    ));
  };

  const activeShares = contacts.filter(c => c.isSharing).length;

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2>Location Sharing</h2>
        <p className="text-muted-foreground">Share your real-time location with trusted contacts</p>
      </div>

      {/* Live Sharing Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-full flex items-center justify-center ${isLiveSharing ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <Share2 className={`size-5 ${isLiveSharing ? 'text-green-600 dark:text-green-400' : 'text-gray-600'}`} />
            </div>
            <div>
              <h4>Live Location Sharing</h4>
              <p className="text-sm text-muted-foreground">
                {isLiveSharing ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
          <Switch checked={isLiveSharing} onCheckedChange={setIsLiveSharing} />
        </div>
        {isLiveSharing && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <div className="size-2 rounded-full bg-green-500 animate-pulse" />
              Sharing location with {activeShares} contact{activeShares !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </Card>

      {/* Current Location */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <MapPin className="size-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4>Current Location</h4>
            <p className="text-sm text-muted-foreground">123 Main Street, Downtown</p>
            <p className="text-xs text-muted-foreground mt-1">Last updated: Just now</p>
          </div>
        </div>
      </Card>

      {/* Share with Contacts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3>Share with Contacts</h3>
          <Badge variant="outline">
            <Users className="size-3 mr-1" />
            {activeShares} active
          </Badge>
        </div>

        <div className="space-y-2">
          {contacts.map((contact) => (
            <Card key={contact.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    <div className="size-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white">
                      {contact.name.charAt(0)}
                    </div>
                  </Avatar>
                  <div>
                    <h4>{contact.name}</h4>
                    <p className="text-sm text-muted-foreground">{contact.email}</p>
                    {contact.isSharing && contact.lastUpdate && (
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="size-3 text-green-600" />
                        <span className="text-xs text-green-600">Shared {contact.lastUpdate}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant={contact.isSharing ? "destructive" : "default"}
                  size="sm"
                  onClick={() => toggleContactSharing(contact.id)}
                  disabled={!isLiveSharing}
                >
                  {contact.isSharing ? (
                    <>
                      <X className="size-4 mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Share2 className="size-4 mr-1" />
                      Share
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Share Options */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <h4 className="mb-3">Quick Share Options</h4>
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start" size="sm">
            <Clock className="size-4 mr-2" />
            Share for 1 hour
          </Button>
          <Button variant="outline" className="w-full justify-start" size="sm">
            <Clock className="size-4 mr-2" />
            Share until I arrive
          </Button>
          <Button variant="outline" className="w-full justify-start" size="sm">
            <Share2 className="size-4 mr-2" />
            Share via link
          </Button>
        </div>
      </Card>
    </div>
  );
}
