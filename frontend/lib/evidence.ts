import { authedApiFetch } from "./api";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";

let currentRecording: Audio.Recording | null = null;
let captureSessionId = 0;
let captureCycleInProgress = false;

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

async function readFileBase64WithRetry(localUri: string, attempts = 10, delayMs = 250) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(delayMs);
      }
    }
  }
  throw lastError;
}

type EvidenceCaptureOptions = {
  capturePhoto?: () => Promise<void>;
};

export const startEvidenceCapture = (alertId: string, token: string, options: EvidenceCaptureOptions = {}) => {
  captureSessionId += 1;
  captureCycleInProgress = false;
  const sessionId = captureSessionId;
  const capturePhoto = options.capturePhoto;

  const runCaptureLoop = async () => {
    let recording: Audio.Recording | null = null;
    try {
      if (sessionId !== captureSessionId) return;
      if (captureCycleInProgress) {
        console.log("[EvidenceCapture] Skipping cycle because previous cycle is still running.");
        return;
      }
      if (currentRecording) {
        console.log("[EvidenceCapture] Skipping cycle because recording is already active.");
        return;
      }
      captureCycleInProgress = true;

      console.log("[EvidenceCapture] Starting evidence capture cycle...");

      const audioStatus = await Audio.requestPermissionsAsync();
      if (audioStatus.status !== "granted") {
        console.warn("[EvidenceCapture] Microphone permission not granted.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      if (capturePhoto && sessionId === captureSessionId) {
        await capturePhoto();
      }

      while (sessionId === captureSessionId) {
        console.log("[EvidenceCapture] Starting 30-second audio recording...");
        recording = new Audio.Recording();
        currentRecording = recording;

        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();

        await sleep(30000);

        if (sessionId !== captureSessionId || currentRecording !== recording) {
          try {
            await recording.stopAndUnloadAsync();
          } catch {
            // Ignore cleanup failures when session changed mid-cycle.
          }
          return;
        }

        console.log("[EvidenceCapture] 30-second recording complete. Stopping and uploading...");
        await recording.stopAndUnloadAsync();
        currentRecording = null;
        const localUri = recording.getURI();

        if (!localUri) {
          console.warn("[EvidenceCapture] Failed to get recording local URI.");
          continue;
        }

        console.log("[EvidenceCapture] Audio recorded at:", localUri);

        if (capturePhoto && sessionId === captureSessionId) {
          await capturePhoto();
        }

        const base64 = await readFileBase64WithRetry(localUri);

        const filePath = `evidence/${alertId}/audio_${Date.now()}.m4a`;

        await uploadWithRetry("/api/sos/evidence", token, {
          alert_id: alertId,
          type: "Audio",
          file_path: filePath,
          file_base64: base64,
        });

        console.log("[EvidenceCapture] Successfully uploaded 30-second audio evidence.");
      }
    } catch (e) {
      console.error("[EvidenceCapture] Audio record/upload failed:", e);
    } finally {
      if (recording && currentRecording === recording) {
        currentRecording = null;
      }
      captureCycleInProgress = false;
    }
  };

  void runCaptureLoop();
  console.log("[EvidenceCapture] Started sequential evidence capture loop for alert", alertId);
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
  captureCycleInProgress = false;

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
