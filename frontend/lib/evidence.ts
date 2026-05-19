import { authedApiFetch } from "./api";

// This is a simulated evidence capture module.
// In a full native implementation, this would use expo-camera and expo-av
// and upload actual files via Supabase Storage.
// For now, it periodically posts mock evidence to the backend.

let captureInterval: NodeJS.Timeout | null = null;

export const startEvidenceCapture = (alertId: string, token: string) => {
  if (captureInterval) {
    clearInterval(captureInterval);
  }

  let counter = 0;
  
  // Every 30 seconds, simulate capturing and uploading evidence
  captureInterval = setInterval(async () => {
    counter++;
    const isAudio = counter % 2 === 0;
    const type = isAudio ? "Audio" : "Photo";
    const filePath = isAudio
      ? `evidence/${alertId}/audio_${Date.now()}.m4a`
      : `evidence/${alertId}/photo_${Date.now()}.jpg`;

    try {
      console.log(`[EvidenceCapture] Capturing ${type} and uploading to ${filePath}`);
      
      // Send the evidence metadata to the backend
      await authedApiFetch("/api/sos/evidence", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alert_id: alertId,
          type,
          file_path: filePath,
        }),
      });
      
      console.log(`[EvidenceCapture] Successfully saved ${type} metadata.`);
    } catch (e) {
      console.error("[EvidenceCapture] Failed to capture or upload evidence:", e);
      // In a real implementation, we would queue this locally using AsyncStorage 
      // or sqlite and retry when the network is restored.
    }
  }, 30000); // 30 seconds

  console.log("[EvidenceCapture] Started capturing evidence for alert", alertId);
};

export const stopEvidenceCapture = () => {
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
    console.log("[EvidenceCapture] Stopped capturing evidence.");
  }
};
