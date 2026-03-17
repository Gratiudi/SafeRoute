import { useState } from "react";
import { Users, Phone, Mail, Plus, X, Shield } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Avatar } from "./ui/avatar";

interface Contact {
  id: number;
  name: string;
  phone: string;
  email: string;
  relationship: string;
}

export function EmergencyContacts() {
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: 1,
      name: "Mom",
      phone: "+251 95 987 6543",
      email: "mom@example.com",
      relationship: "Family"
    },
    {
      id: 2,
      name: "Dad",
      phone: "+251 95 987 6543",
      email: "dad@example.com",
      relationship: "Family"
    },
    {
      id: 3,
      name: "Sara Zenebe",
      phone: "+251 95 987 6543",
      email: "sarah@example.com",
      relationship: "Friend"
    },
    {
      id: 4,
      name: "Emergency Services",
      phone: "911",
      email: "emergency@local.gov",
      relationship: "Emergency"
    }
  ]);

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

  const handleCall = (phone: string) => {
    // In a real app, this would initiate a phone call
    alert(`Calling ${phone}...`);
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2>Emergency Contacts</h2>
        <p className="text-muted-foreground">Manage your trusted emergency contacts</p>
      </div>

      {/* Add Contact Button */}
      <Dialog open={isAddingContact} onOpenChange={setIsAddingContact}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="size-4 mr-2" />
            Add Emergency Contact
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Emergency Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Contact name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
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
                placeholder="e.g., Family, Friend, etc."
                value={newContact.relationship}
                onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
              />
            </div>
            <Button onClick={handleAddContact} className="w-full">
              Add Contact
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contacts List */}
      <div className="space-y-3">
        <h3>Your Emergency Contacts ({contacts.length})</h3>
        {contacts.map((contact) => (
          <Card key={contact.id} className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="size-12">
                <div className="size-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white">
                  {contact.name.charAt(0)}
                </div>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4>{contact.name}</h4>
                    <p className="text-sm text-muted-foreground">{contact.relationship}</p>
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
                
                <div className="space-y-2">
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

                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleCall(contact.phone)}
                  >
                    <Phone className="size-3 mr-1" />
                    Call
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Mail className="size-3 mr-1" />
                    Message
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <h4 className="mb-2">Tips for Emergency Contacts</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Add at least 3 trusted contacts</li>
          <li>• Include family members and close friends</li>
          <li>• Keep contact information up to date</li>
          <li>• Test emergency alerts regularly</li>
        </ul>
      </Card>
    </div>
  );
}