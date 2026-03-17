import { useState, useEffect } from "react";
import { ShieldAlert, Phone, MapPin, Users, X, Mic, Camera } from "lucide-react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";

interface EmergencyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEvidenceRecorded?: (evidence: { audio: string; photo: string; timestamp: Date }[]) => void;
}

export function EmergencyDialog({ isOpen, onClose, onEvidenceRecorded }: EmergencyDialogProps) {
  const [countdown, setCountdown] = useState(5);
  const [isActivated, setIsActivated] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [captureCount, setCaptureCount] = useState(0);
  const [evidenceRecords, setEvidenceRecords] = useState<Array<{ audio: string; photo: string; timestamp: Date }>>([]);

  useEffect(() => {
    if (isOpen && countdown > 0 && !isActivated) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !isActivated) {
      setIsActivated(true);
      // In a real app, this would trigger emergency services
    }
  }, [countdown, isOpen, isActivated]);

  // Recording timer and evidence capture
  useEffect(() => {
    if (isActivated) {
      const interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
        
        // Every 30 seconds, capture audio and photo
        if ((recordingTime + 1) % 30 === 0) {
          const newEvidence = {
            audio: `audio_${Date.now()}.webm`,
            photo: `photo_${Date.now()}.jpg`,
            timestamp: new Date()
          };
          setEvidenceRecords((prev) => [...prev, newEvidence]);
          setCaptureCount((prev) => prev + 1);
          
          // In a real app, this would actually record audio and capture photo
          console.log('Evidence captured:', newEvidence);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isActivated, recordingTime]);

  const handleCancel = () => {
    // Save evidence before closing
    if (evidenceRecords.length > 0 && onEvidenceRecorded) {
      onEvidenceRecorded(evidenceRecords);
    }
    
    setCountdown(5);
    setIsActivated(false);
    setRecordingTime(0);
    setCaptureCount(0);
    setEvidenceRecords([]);
    onClose();
  };

  const handleActivateNow = () => {
    setCountdown(0);
    setIsActivated(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <div className="space-y-6">
          {!isActivated ? (
            <>
              {/* Countdown */}
              <div className="text-center space-y-4">
                <div className="size-24 mx-auto rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center animate-pulse">
                  <ShieldAlert className="size-12 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-red-600 dark:text-red-400">Emergency SOS</h2>
                  <p className="text-muted-foreground mt-2">
                    Activating emergency services in
                  </p>
                  <div className="text-6xl text-red-600 dark:text-red-400 my-4">
                    {countdown}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your emergency contacts will be notified
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleActivateNow}
                >
                  Activate Now
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleCancel}
                >
                  <X className="size-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Activated State */}
              <div className="text-center space-y-4">
                <div className="size-24 mx-auto rounded-full bg-red-600 flex items-center justify-center">
                  <ShieldAlert className="size-12 text-white" />
                </div>
                <div>
                  <h2 className="text-red-600 dark:text-red-400">SOS Activated!</h2>
                  <p className="text-muted-foreground mt-2">
                    Your emergency contacts have been notified
                  </p>
                  <div className="text-2xl mt-3">{formatTime(recordingTime)}</div>
                </div>
              </div>

              {/* Status Updates */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="size-6 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                    <Users className="size-3 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Alerting emergency contacts...</p>
                    <p className="text-xs text-muted-foreground">Contacts being notified</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="size-6 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                    <MapPin className="size-3 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Sharing your location...</p>
                    <p className="text-xs text-muted-foreground">Live location active</p>
                  </div>
                </div>

                {/* Evidence Recording */}
                <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                  <div className="size-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                    <Mic className="size-3 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Recording audio evidence...</p>
                    <p className="text-xs text-muted-foreground">
                      Next capture in {30 - (recordingTime % 30)}s
                    </p>
                  </div>
                  <div className="size-2 rounded-full bg-red-500 animate-pulse" />
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <div className="size-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Camera className="size-3 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Capturing photo evidence...</p>
                    <p className="text-xs text-muted-foreground">
                      {captureCount} capture{captureCount !== 1 ? 's' : ''} recorded
                    </p>
                  </div>
                  <div className="size-2 rounded-full bg-blue-500 animate-pulse" />
                </div>
              </div>

              <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-center text-orange-900 dark:text-orange-100">
                  <strong>Evidence Recording Active</strong>
                  <br />
                  <span className="text-xs">Audio and photos are being recorded every 30 seconds for your safety</span>
                </p>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleCancel}
              >
                End Emergency & Save Evidence
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}