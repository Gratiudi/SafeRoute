import { authedApiFetch } from "./api";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";

let captureInterval: ReturnType<typeof setInterval> | null = null;
let currentRecording: Audio.Recording | null = null;
let captureSessionId = 0;

const uploadRetryDelayMs = 3000;
const uploadRetryAttempts = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableUploadError(error: unknown) {
  if (!error) return true;
  if (error instanceof Error && error.name === "ApiError") {
    return false;
  }
  return true;
}

async function uploadWithRetry(path: string, token: string, body: unknown, retries = uploadRetryAttempts) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await authedApiFetch(path, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      lastError = error;

      if (!isRetryableUploadError(error) || attempt === retries) {
        break;
      }

      console.warn(
        `[EvidenceCapture] Upload attempt ${attempt} failed. Retrying in ${uploadRetryDelayMs / 1000}s...`,
        error instanceof Error ? error.message : error
      );
      await sleep(uploadRetryDelayMs);
    }
  }

  console.warn(
    `[EvidenceCapture] Upload failed after ${retries} attempts.`,
    lastError instanceof Error ? lastError.message : lastError
  );
  throw lastError;
}

async function waitForFileToExist(localUri: string, attempts = 10, delayMs = 200) {
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
  if (captureInterval) {
    clearInterval(captureInterval);
  }
  captureSessionId += 1;
  const sessionId = captureSessionId;

  // Define a function to capture one cycle: photo + 30 seconds of audio + photo
  const captureCycle = async () => {
    let recording: Audio.Recording | null = null;
    try {
      if (sessionId !== captureSessionId) return;

      console.log("[EvidenceCapture] Starting evidence capture cycle...");
      
      // Step 1: Request permissions
      const audioStatus = await Audio.requestPermissionsAsync();
      if (audioStatus.status !== "granted") {
        console.warn("[EvidenceCapture] Microphone permission not granted.");
        return;
      }

      // Note: Photo capture is handled by the HomeScreen component
      // which manages the camera independently. This function handles audio.

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("[EvidenceCapture] Starting 30-second audio recording...");
      recording = new Audio.Recording();
      currentRecording = recording;
      
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      // Record for 30 seconds
      await new Promise((resolve) => setTimeout(resolve, 30000));

      if (sessionId !== captureSessionId || currentRecording !== recording) {
        return;
      }

      console.log("[EvidenceCapture] 30-second recording complete. Stopping and uploading...");
      await recording.stopAndUnloadAsync();
      const localUri = recording.getURI();

      if (!localUri) {
        console.warn("[EvidenceCapture] Failed to get recording local URI.");
        return;
      }

      console.log("[EvidenceCapture] Audio recorded at:", localUri);

      const fileExists = await waitForFileToExist(localUri);
      if (!fileExists) {
        console.warn("[EvidenceCapture] Audio file not found after recording:", localUri);
        return;
      }

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const filePath = `evidence/${alertId}/audio_${Date.now()}.m4a`;

      // Upload to backend
      await uploadWithRetry("/api/sos/evidence", token, {
        alert_id: alertId,
        type: "Audio",
        file_path: filePath,
        file_base64: base64,
      });

      console.log("[EvidenceCapture] Successfully uploaded 30-second audio evidence.");
    } catch (e) {
      console.error("[EvidenceCapture] Audio record/upload failed:", e);
    } finally {
      if (recording && currentRecording === recording) {
        currentRecording = null;
      }
    }
  };

  // Perform initial capture cycle immediately
  void captureCycle();

  // Then repeat every 30 seconds (photo capture is handled by HomeScreen timer)
  captureInterval = setInterval(() => {
    void captureCycle();
  }, 30000);

  console.log("[EvidenceCapture] Started evidence capture loop (30s audio + photo cycle) for alert", alertId);
};

export const uploadPhotoEvidence = async (alertId: string, token: string, localUri: string) => {
  try {
    console.log("[EvidenceCapture] Reading photo as base64 from:", localUri);

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const filePath = `evidence/${alertId}/photo_${Date.now()}.jpg`;

    await uploadWithRetry("/api/sos/evidence", token, {
      alert_id: alertId,
      type: "Photo",
      file_path: filePath,
      file_base64: base64,
    });

    console.log("[EvidenceCapture] Successfully uploaded photo evidence.");
  } catch (e) {
    console.error("[EvidenceCapture] Photo upload failed:", e);
  }
};

export const stopEvidenceCapture = async () => {
  captureSessionId += 1;

  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }

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
