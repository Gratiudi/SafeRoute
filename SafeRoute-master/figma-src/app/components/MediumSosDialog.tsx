import { useState, useEffect } from "react";
import { AlertTriangle, User, Plus, Minus, X } from "lucide-react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface Contact {
  id: number;
  name: string;
  phone: string;
}

interface MediumSosDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEscalateToFullSos: () => void;
}

type Step = "initial" | "selectTime" | "selectContact" | "countdown";

export function MediumSosDialog({ isOpen, onClose, onEscalateToFullSos }: MediumSosDialogProps) {
  const [step, setStep] = useState<Step>("initial");
  const [escalationTime, setEscalationTime] = useState(5); // in minutes
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [countdown, setCountdown] = useState(0); // in seconds
  const [notifyContact, setNotifyContact] = useState(false);

  // Mock contacts - in a real app, this would come from the app state
  const contacts: Contact[] = [
    { id: 1, name: "Mom", phone: "+1 (555) 123-4567" },
    { id: 2, name: "Dad", phone: "+1 (555) 234-5678" },
    { id: 3, name: "Sarah Johnson", phone: "+1 (555) 345-6789" },
  ];

  // Countdown timer
  useEffect(() => {
    if (step === "countdown" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (step === "countdown" && countdown === 0) {
      // Auto-escalate to full SOS
      handleEscalateNow();
    }
  }, [countdown, step]);

  const handleStartMediumSos = () => {
    setStep("selectTime");
  };

  const handleTimeSelected = () => {
    setStep("selectContact");
  };

  const handleContactSelected = (contact: Contact | null, notify: boolean) => {
    setSelectedContact(contact);
    setNotifyContact(notify);
    setCountdown(escalationTime * 60); // convert minutes to seconds
    setStep("countdown");
  };

  const handleAddTime = () => {
    setCountdown((prev) => prev + 60); // add 1 minute
  };

  const handleCancel = () => {
    setStep("initial");
    setEscalationTime(5);
    setSelectedContact(null);
    setCountdown(0);
    setNotifyContact(false);
    onClose();
  };

  const handleEscalateNow = () => {
    handleCancel();
    onEscalateToFullSos();
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderContent = () => {
    switch (step) {
      case "initial":
        return (
          <div className="text-center space-y-4">
            <div className="size-20 mx-auto rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
              <AlertTriangle className="size-10 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-orange-600 dark:text-orange-400">I Feel Unsafe</h2>
              <p className="text-muted-foreground mt-2">
                Start a delayed emergency alert with an escalation timer
              </p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800 text-left">
              <p className="text-sm">
                <strong>How it works:</strong>
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Choose escalation time (1-10 minutes)</li>
                <li>• Optionally notify a primary contact</li>
                <li>• Timer counts down with option to cancel</li>
                <li>• Automatically escalates to full SOS if timer reaches zero</li>
              </ul>
            </div>
            <Button
              className="w-full bg-orange-600 hover:bg-orange-700"
              onClick={handleStartMediumSos}
            >
              Continue
            </Button>
            <Button variant="outline" className="w-full" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        );

      case "selectTime":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="size-16 mx-auto rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mb-3">
                <AlertTriangle className="size-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h3>Select Escalation Time</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose how long before escalating to full SOS
              </p>
            </div>

            <Card className="p-6">
              <div className="flex items-center justify-center gap-6">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setEscalationTime(Math.max(1, escalationTime - 1))}
                  disabled={escalationTime <= 1}
                >
                  <Minus className="size-5" />
                </Button>

                <div className="text-center min-w-[120px]">
                  <div className="text-5xl text-orange-600 dark:text-orange-400">
                    {escalationTime}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    minute{escalationTime !== 1 ? "s" : ""}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setEscalationTime(Math.min(10, escalationTime + 1))}
                  disabled={escalationTime >= 10}
                >
                  <Plus className="size-5" />
                </Button>
              </div>
            </Card>

            <div className="space-y-2">
              <Button className="w-full" onClick={handleTimeSelected}>
                Continue
              </Button>
              <Button variant="outline" className="w-full" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        );

      case "selectContact":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="size-16 mx-auto rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mb-3">
                <User className="size-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h3>Notify a Primary Contact?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This will escalate to full SOS in {escalationTime} minute
                {escalationTime !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm">Select a contact to notify (optional):</p>
              {contacts.map((contact) => (
                <Card
                  key={contact.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedContact?.id === contact.id
                      ? "border-orange-600 bg-orange-50 dark:bg-orange-950"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => setSelectedContact(contact)}
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white">
                      {contact.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm">{contact.name}</h4>
                      <p className="text-xs text-muted-foreground">{contact.phone}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => handleContactSelected(selectedContact, true)}
                disabled={!selectedContact}
              >
                Notify {selectedContact?.name || "Contact"} & Start Timer
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleContactSelected(null, false)}
              >
                Start Timer Without Notification
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </div>
          </div>
        );

      case "countdown":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="size-24 mx-auto rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                <AlertTriangle className="size-12 text-orange-600 dark:text-orange-400 animate-pulse" />
              </div>
              <div>
                <h2 className="text-orange-600 dark:text-orange-400">Timer Active</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Will escalate to full SOS in:
                </p>
                <div className="text-6xl text-orange-600 dark:text-orange-400 my-4">
                  {formatCountdown(countdown)}
                </div>
              </div>
            </div>

            {notifyContact && selectedContact && (
              <Card className="p-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <p className="text-sm text-center">
                  <strong>{selectedContact.name}</strong> has been notified
                </p>
              </Card>
            )}

            <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-center">
                <strong>If you don't cancel, this will automatically escalate to full emergency SOS</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="w-full" onClick={handleAddTime}>
                <Plus className="size-4 mr-1" />
                Add Time
              </Button>
              <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleEscalateNow}>
                SOS Now
              </Button>
            </div>

            <Button variant="outline" className="w-full" onClick={handleCancel}>
              <X className="size-4 mr-2" />
              Cancel Timer
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
