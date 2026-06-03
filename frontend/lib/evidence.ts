import { authedApiFetch } from "./api";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";

let isCapturing = false;
let currentRecording: Audio.Recording | null = null;

async function waitForFileToExist(localUri: string, attempts = 15, delayMs = 200) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const info = await FileSystem.getInfoAsync(localUri);
    if (info.exists) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

export const startEvidenceCapture = (alertId: string, token: string) => {
  if (isCapturing) return;
  isCapturing = true;

  console.log("[EvidenceCapture] Started 30-second continuous audio evidence capture loop for alert", alertId);

  const loop = async () => {
    while (isCapturing) {
      let recording: Audio.Recording | null = null;
      try {
        console.log("[EvidenceCapture] Starting 30-second audio recording...");
        
        // Request permission
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== "granted") {
          console.warn("[EvidenceCapture] Microphone permission not granted.");
          // Wait a bit before retrying so we don't spin endlessly if permissions are permanently denied
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        recording = new Audio.Recording();
        currentRecording = recording;
        
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();

        // Record for 30 seconds, checking every second if we should stop
        for (let i = 0; i < 30; i++) {
          if (!isCapturing) break;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (!isCapturing) {
           break; // Stop loop if we're no longer capturing
        }

        await recording.stopAndUnloadAsync();
        const localUri = recording.getURI();

        if (!localUri) {
          console.warn("[EvidenceCapture] Failed to get recording local URI.");
          continue;
        }

        const fileExists = await waitForFileToExist(localUri);
        if (!fileExists) {
          console.warn("[EvidenceCapture] Audio file not found after waiting:", localUri);
          continue;
        }

        console.log("[EvidenceCapture] Audio recorded at:", localUri);

        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const filePath = `evidence/${alertId}/audio_${Date.now()}.m4a`;

        // Upload to backend
        await authedApiFetch("/api/sos/evidence", token, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alert_id: alertId,
            type: "Audio",
            file_path: filePath,
            file_base64: base64,
          }),
        });

        console.log("[EvidenceCapture] Successfully uploaded audio evidence snippet.");
      } catch (e) {
        console.error("[EvidenceCapture] Audio snippet record/upload failed:", e);
        // Wait a little before retrying on failure
        await new Promise(resolve => setTimeout(resolve, 5000));
      } finally {
        if (recording && currentRecording === recording) {
          currentRecording = null;
        }
      }
    }
  };

  void loop();
};

export const uploadPhotoEvidence = async (alertId: string, token: string, localUri: string) => {
  try {
    console.log("[EvidenceCapture] Reading photo as base64 from:", localUri);

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const filePath = `evidence/${alertId}/photo_${Date.now()}.jpg`;

    await authedApiFetch("/api/sos/evidence", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alert_id: alertId,
        type: "Photo",
        file_path: filePath,
        file_base64: base64,
      }),
    });

    console.log("[EvidenceCapture] Successfully uploaded photo evidence.");
  } catch (e) {
    console.error("[EvidenceCapture] Photo upload failed:", e);
  }
};

export const stopEvidenceCapture = async () => {
  isCapturing = false;

  if (currentRecording) {
    try {
      await currentRecording.stopAndUnloadAsync();
    } catch {
      // ignore failures during forced stop
    }
    currentRecording = null;
  }

  console.log("[EvidenceCapture] Stopped capturing evidence.");
};
