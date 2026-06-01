import { useState } from "react";
import { Users, Phone, Mail, Plus, X, Shield, ArrowRight } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

interface Contact {
  id: number;
  name: string;
  phone: string;
  email: string;
  relationship: string;
}

interface EmergencyContactSetupProps {
  userName: string;
  onComplete: (contacts: Contact[]) => void;
  onSkip: () => void;
}

export function EmergencyContactSetup({ userName, onComplete, onSkip }: EmergencyContactSetupProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    phone: "",
    email: "",
    relationship: ""
  });

  const handleAddContact = () => {
    if (newContact.name && newContact.phone) {
      setContacts([...contacts, { ...newContact, id: Date.now() }]);
      setNewContact({ name: "", phone: "", email: "", relationship: "" });
      setIsAddingContact(false);
    }
  };

  const handleDeleteContact = (id: number) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const handleComplete = () => {
    if (contacts.length === 0) {
      if (confirm("Are you sure you want to continue without adding emergency contacts? You can add them later in your profile.")) {
        onComplete(contacts);
      }
    } else {
      onComplete(contacts);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Shield className="size-4 text-white" />
          </div>
          <h2>Setup Emergency Contacts</h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Welcome Message */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
            <h3 className="mb-2">Welcome, {userName}!</h3>
            <p className="text-sm text-muted-foreground">
              Let's set up your emergency contacts. These trusted contacts will be notified when you activate the SOS feature.
            </p>
          </Card>

          {/* Info Card */}
          <Card className="p-4 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
            <div className="flex items-start gap-3">
              <Users className="size-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm mb-1">Why add emergency contacts?</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Get help quickly during emergencies</li>
                  <li>• Share your live location automatically</li>
                  <li>• Receive evidence recordings from SOS incidents</li>
                  <li>• You can add or modify contacts anytime</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Add Contact Button */}
          <Button 
            className="w-full h-12"
            onClick={() => setIsAddingContact(true)}
          >
            <Plus className="size-4 mr-2" />
            Add Emergency Contact
          </Button>

          {/* Add Contact Dialog */}
          <Dialog open={isAddingContact} onOpenChange={setIsAddingContact}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Emergency Contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    placeholder="Contact name"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input
                    placeholder="+1 (555) 123-4567"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email (Optional)</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Input
                    placeholder="e.g., Family, Friend, Colleague"
                    value={newContact.relationship}
                    onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddContact} className="w-full" disabled={!newContact.name || !newContact.phone}>
                  Add Contact
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Contacts List */}
          {contacts.length > 0 && (
            <div className="space-y-3">
              <h3>Your Emergency Contacts ({contacts.length})</h3>
              {contacts.map((contact) => (
                <Card key={contact.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="size-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white flex-shrink-0">
                      {contact.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4>{contact.name}</h4>
                          {contact.relationship && (
                            <p className="text-sm text-muted-foreground">{contact.relationship}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Phone className="size-4 text-muted-foreground" />
                          <span className="text-sm">{contact.phone}</span>
                        </div>
                        {contact.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="size-4 text-muted-foreground" />
                            <span className="text-sm truncate">{contact.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {contacts.length === 0 && (
            <Card className="p-8 text-center">
              <Users className="size-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No emergency contacts added yet
              </p>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-4">
            <Button 
              className="w-full h-12"
              onClick={handleComplete}
              disabled={contacts.length === 0}
            >
              <ArrowRight className="size-4 mr-2" />
              Continue to Dashboard
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full h-12"
              onClick={onSkip}
            >
              Skip for Now
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            You can add or modify emergency contacts anytime from your profile settings
          </p>
        </div>
      </div>
    </div>
  );
}
