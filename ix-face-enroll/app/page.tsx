"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, X, CheckCircle2, AlertCircle, Loader2, Settings, RefreshCw, Wifi, WifiOff } from "lucide-react";

const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://138.197.234.202:8080";

// Debug: Log API URL configuration
console.log("[DEBUG] API Configuration:", {
  DEFAULT_API_URL,
  isClient: typeof window !== "undefined"
});

interface CapturedImage {
  id: string;
  dataUrl: string;
  uploaded: boolean;
}

export default function Home() {
  const [apiUrl, setApiUrl] = useState<string>(DEFAULT_API_URL);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsApiUrl, setSettingsApiUrl] = useState<string>(DEFAULT_API_URL);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [step, setStep] = useState<"name" | "capture" | "complete">("name");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Enumerate available cameras
  const enumerateCameras = async () => {
    try {
      // Request permission first to get device labels
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the temporary stream immediately
      tempStream.getTracks().forEach(track => track.stop());
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log("[DEBUG] Available cameras:", videoDevices);
      setAvailableCameras(videoDevices);
      
      // Preserve selected camera if it still exists, otherwise set default
      if (videoDevices.length > 0) {
        const currentSelectedExists = selectedCameraId && videoDevices.some(device => device.deviceId === selectedCameraId);
        if (!currentSelectedExists) {
          setSelectedCameraId(videoDevices[0].deviceId);
        }
      }
    } catch (error) {
      console.error("[ERROR] Failed to enumerate cameras:", error);
      // If permission denied, still try to enumerate (labels will be empty)
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(videoDevices);
        
        // Preserve selected camera if it still exists, otherwise set default
        if (videoDevices.length > 0) {
          const currentSelectedExists = selectedCameraId && videoDevices.some(device => device.deviceId === selectedCameraId);
          if (!currentSelectedExists) {
            setSelectedCameraId(videoDevices[0].deviceId);
          }
        }
      } catch (enumError) {
        console.error("[ERROR] Failed to enumerate devices:", enumError);
      }
    }
  };

  // Load API URL from localStorage on mount
  useEffect(() => {
    const savedApiUrl = localStorage.getItem("apiUrl");
    if (savedApiUrl) {
      setApiUrl(savedApiUrl);
      setSettingsApiUrl(savedApiUrl);
    }
    console.log("[DEBUG] Component mounted");
    console.log("[DEBUG] DEFAULT_API_URL:", DEFAULT_API_URL);
    console.log("[DEBUG] NEXT_PUBLIC_API_URL env:", process.env.NEXT_PUBLIC_API_URL);
  }, []);

  // Save API URL to localStorage when it changes
  useEffect(() => {
    if (apiUrl !== DEFAULT_API_URL) {
      localStorage.setItem("apiUrl", apiUrl);
    }
  }, [apiUrl]);

  useEffect(() => {
    console.log("[DEBUG] Stream changed:", { hasStream: !!stream, isStopping });
    if (stream && videoRef.current && !isStopping) {
      console.log("[DEBUG] Setting video srcObject and playing");
      // Clear any existing srcObject first to avoid play() interruption
      if (videoRef.current.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      // Small delay to ensure cleanup is complete
      setTimeout(() => {
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((error) => {
            // Ignore AbortError which happens when switching cameras
            if (error.name !== 'AbortError') {
              console.error("[ERROR] Failed to play video:", error);
            }
          });
        }
      }, 50);
    } else if (!stream && videoRef.current && !isStopping) {
      // Only clear if we're not intentionally stopping
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }
    return () => {
      if (stream) {
        console.log("[DEBUG] Cleaning up stream on unmount");
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream, isStopping]);

  // Debug: Log state changes
  useEffect(() => {
    console.log("[DEBUG] State update:", {
      step,
      name,
      relationship,
      apiUrl,
      capturedImagesCount: capturedImages.length,
      uploadedCount: capturedImages.filter(img => img.uploaded).length,
      isUploading,
      isTraining,
      hasStream: !!stream
    });
  }, [step, name, apiUrl, capturedImages, isUploading, isTraining, stream]);

  const getEnrollmentIdentifier = () => {
    const normalizedName = name.trim().toLowerCase();
    const normalizedRelationship = relationship.trim().toLowerCase();
    if (!normalizedName || !normalizedRelationship) {
      return "";
    }
    return `${normalizedName}_${normalizedRelationship}`;
  };

  const handleSaveSettings = () => {
    if (settingsApiUrl.trim()) {
      setApiUrl(settingsApiUrl.trim());
      setShowSettings(false);
      setMessage({ type: "success", text: "API URL updated successfully!" });
    }
  };

  const handleOpenSettings = () => {
    setSettingsApiUrl(apiUrl);
    setApiTestResult(null);
    setShowSettings(true);
  };

  const testApiConnection = async () => {
    const urlToTest = settingsApiUrl.trim() || apiUrl;
    if (!urlToTest) {
      setApiTestResult({ success: false, message: "Please enter an API URL" });
      return;
    }

    setIsTestingApi(true);
    setApiTestResult(null);

    try {
      // Use proxy route for production or if testing the default backend URL
      const useProxy = process.env.NODE_ENV === 'production' || urlToTest.includes('165.227.17.154');
      
      if (useProxy) {
        // Test via proxy route
        try {
          const response = await fetch('/api/health', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000),
          });

          const result = await response.json();
          setApiTestResult({
            success: result.success,
            message: result.message || (result.success ? 'API is reachable via proxy!' : 'API connection failed')
          });
          setIsTestingApi(false);
          return;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          setApiTestResult({
            success: false,
            message: `Proxy test failed: ${errorMessage}`
          });
          setIsTestingApi(false);
          return;
        }
      }

      // Direct connection test (for development/testing other URLs)
      const healthEndpoints = ['/health', '/api/health', '/status'];
      let lastError: Error | null = null;

      for (const endpoint of healthEndpoints) {
        try {
          const response = await fetch(`${urlToTest}${endpoint}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000), // 5 second timeout
          });

          if (response.ok) {
            await response.json().catch(() => ({})); // Try to parse JSON, ignore if not JSON
            setApiTestResult({
              success: true,
              message: `API is reachable! Endpoint: ${endpoint} (Status: ${response.status})`
            });
            setIsTestingApi(false);
            return;
          } else {
            // If endpoint exists but returns error, still consider it reachable
            setApiTestResult({
              success: true,
              message: `API is reachable! Endpoint: ${endpoint} (Status: ${response.status})`
            });
            setIsTestingApi(false);
            return;
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          continue;
        }
      }

      // If all health endpoints failed, try the base URL
      try {
        const response = await fetch(urlToTest, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        });

        setApiTestResult({
          success: true,
          message: `API is reachable! Base URL responded (Status: ${response.status})`
        });
      } catch (error) {
        const errorMessage = lastError?.message || (error instanceof Error ? error.message : String(error));
        if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
          setApiTestResult({
            success: false,
            message: `Connection timeout. The API server may be down or unreachable.`
          });
        } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
          setApiTestResult({
            success: false,
            message: `Network error. Check if the API URL is correct and the server is running.`
          });
        } else {
          setApiTestResult({
            success: false,
            message: `Connection failed: ${errorMessage}`
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setApiTestResult({
        success: false,
        message: `Test failed: ${errorMessage}`
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  // Ensure video plays when step changes to capture
  useEffect(() => {
    if (step === "capture" && stream && videoRef.current) {
      console.log("[DEBUG] Step is 'capture', ensuring video is set up");
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((error) => {
        console.error("[ERROR] Failed to play video when step changed:", error);
      });
    }
  }, [step, stream]);

  const startCamera = async (deviceId?: string) => {
    console.log("[DEBUG] startCamera called", { deviceId, selectedCameraId });
    try {
      // Refresh camera list before starting if we don't have cameras yet
      if (availableCameras.length === 0) {
        await enumerateCameras();
      }
      
      const cameraToUse = deviceId || selectedCameraId;
      console.log("[DEBUG] Requesting camera access with device:", cameraToUse);
      
      const constraints: MediaStreamConstraints = {
        video: cameraToUse
          ? {
              deviceId: { exact: cameraToUse },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          : {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("[DEBUG] Camera access granted:", mediaStream);
      console.log("[DEBUG] Stream tracks:", mediaStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
      
      setStream(mediaStream);
      setStep("capture");
      console.log("[DEBUG] Step changed to 'capture'");
      
      // Ensure video plays after a short delay to allow DOM update
      setTimeout(() => {
        if (videoRef.current && mediaStream) {
          console.log("[DEBUG] Ensuring video plays after step change");
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch((error) => {
            console.error("[ERROR] Failed to play video in timeout:", error);
          });
        }
      }, 100);
    } catch (error) {
      console.error("[ERROR] Failed to access camera:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setMessage({ 
        type: "error", 
        text: `Failed to access camera: ${errorMessage}. Please check permissions.` 
      });
    }
  };

  const switchCamera = async (deviceId: string) => {
    console.log("[DEBUG] switchCamera called:", deviceId);
    
    // Update selected camera immediately
    setSelectedCameraId(deviceId);
    
    // If camera is already running, switch immediately
    if (stream) {
      setIsStopping(true);
      setIsVideoReady(false);
      
      // Stop current stream immediately
      const currentStream = stream;
      if (videoRef.current) {
        const currentSrcObject = videoRef.current.srcObject as MediaStream | null;
        if (currentSrcObject) {
          currentSrcObject.getTracks().forEach(track => track.stop());
        }
        videoRef.current.srcObject = null;
        videoRef.current.pause();
      }
      currentStream.getTracks().forEach((track) => track.stop());
      setStream(null);
      
      // Small delay to ensure cleanup is complete before starting new stream
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Start new camera
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: { exact: deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
        };
        
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setIsStopping(false);
        setStream(newStream);
        
        // Video will be set up by the useEffect hook
      } catch (error) {
        setIsStopping(false);
        console.error("[ERROR] Failed to switch camera:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setMessage({ 
          type: "error", 
          text: `Failed to switch camera: ${errorMessage}` 
        });
      }
    }
  };

  const stopCamera = () => {
    console.log("[DEBUG] stopCamera called");
    setIsStopping(true);
    
    // Immediately clear video element first for instant UI feedback
    if (videoRef.current) {
      const currentSrcObject = videoRef.current.srcObject as MediaStream | null;
      if (currentSrcObject) {
        currentSrcObject.getTracks().forEach(track => track.stop());
      }
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }
    
    // Stop all tracks synchronously
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    }
    
    setStream(null);
    setIsVideoReady(false);
    
    // Reset stopping flag after a brief moment
    setTimeout(() => {
      setIsStopping(false);
    }, 100);
  };

  const capturePhoto = () => {
    console.log("[DEBUG] capturePhoto called");
    if (!videoRef.current || !canvasRef.current) {
      console.error("[ERROR] Video or canvas ref is null", { 
        video: !!videoRef.current, 
        canvas: !!canvasRef.current 
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    console.log("[DEBUG] Video dimensions:", {
      width: video.videoWidth,
      height: video.videoHeight,
      readyState: video.readyState,
      paused: video.paused,
      ended: video.ended,
      srcObject: !!video.srcObject
    });

    // Check if video is actually ready
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error("[ERROR] Video dimensions are 0x0 - video not ready");
      setMessage({ 
        type: "error", 
        text: "Video not ready. Please wait for camera to initialize." 
      });
      return;
    }

    if (video.readyState < 2) {
      console.error("[ERROR] Video readyState too low:", video.readyState);
      setMessage({ 
        type: "error", 
        text: "Video not ready. Please wait a moment and try again." 
      });
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("[ERROR] Failed to get 2D context");
      return;
    }

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const id = Date.now().toString();
    
    console.log("[DEBUG] Photo captured:", {
      id,
      dataUrlLength: dataUrl.length,
      imageSize: `${video.videoWidth}x${video.videoHeight}`,
      dataUrlStart: dataUrl.substring(0, 50)
    });

    // Validate dataUrl
    if (!dataUrl || dataUrl.length < 100 || !dataUrl.startsWith('data:image')) {
      console.error("[ERROR] Invalid dataUrl:", dataUrl.substring(0, 100));
      setMessage({ 
        type: "error", 
        text: "Failed to capture image. Please try again." 
      });
      return;
    }

    setCapturedImages((prev) => {
      const newImages = [...prev, { id, dataUrl, uploaded: false }];
      console.log("[DEBUG] Updated captured images count:", newImages.length);
      return newImages;
    });
    uploadImage(dataUrl, id);
  };

  const uploadImage = async (dataUrl: string, id: string) => {
    const enrollmentKey = getEnrollmentIdentifier();
    if (!enrollmentKey) {
      console.error("[ERROR] Enrollment key missing before upload");
      setMessage({
        type: "error",
        text: "Please provide both name and relationship before capturing photos."
      });
      setStep("name");
      return;
    }

    console.log("[DEBUG] uploadImage called:", { id, enrollmentKey, apiUrl });
    setIsUploading(true);
    
    try {
      console.log("[DEBUG] Converting dataUrl to blob...");
      console.log("[DEBUG] DataUrl preview:", dataUrl.substring(0, 100));
      
      // Convert dataUrl to blob properly
      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch dataUrl: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log("[DEBUG] Blob created:", {
        size: blob.size,
        type: blob.type,
        blobTypeValid: blob.type.startsWith('image/')
      });

      if (blob.size === 0) {
        throw new Error("Blob size is 0 - invalid image data");
      }

      if (!blob.type.startsWith('image/')) {
        console.warn("[WARN] Blob type is not image:", blob.type);
        // Try to fix it by creating a new blob with correct type
        const fixedBlob = new Blob([blob], { type: 'image/jpeg' });
        console.log("[DEBUG] Created fixed blob:", { size: fixedBlob.size, type: fixedBlob.type });
      }

      const formData = new FormData();
      formData.append("name", enrollmentKey);
      // Use the blob directly, or fixed blob if needed
      const imageBlob = blob.type.startsWith('image/') ? blob : new Blob([blob], { type: 'image/jpeg' });
      formData.append("image", imageBlob, "photo.jpg");
      
      // Use proxy route to avoid CORS issues
      const useProxy = process.env.NODE_ENV === 'production' || apiUrl.includes('165.227.17.154');
      const enrollUrl = useProxy ? '/api/enroll' : `${apiUrl}/enroll`;
      
      console.log("[DEBUG] FormData created, sending to:", enrollUrl);
      console.log("[DEBUG] FormData entries:", {
        name: enrollmentKey,
        imageSize: imageBlob.size,
        imageType: imageBlob.type
      });

      const uploadResponse = await fetch(enrollUrl, {
        method: "POST",
        body: formData,
      });

      console.log("[DEBUG] Response received:", {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        ok: uploadResponse.ok,
        headers: Object.fromEntries(uploadResponse.headers.entries())
      });

      let result;
      try {
        result = await uploadResponse.json();
        console.log("[DEBUG] Response JSON:", result);
      } catch (jsonError) {
        const text = await uploadResponse.text();
        console.error("[ERROR] Failed to parse JSON response:", {
          status: uploadResponse.status,
          text,
          error: jsonError
        });
        throw new Error(`Server returned invalid JSON (${uploadResponse.status}): ${text.substring(0, 200)}`);
      }

      if (result.success) {
        console.log("[DEBUG] Upload successful:", result);
        setCapturedImages((prev) =>
          prev.map((img) => (img.id === id ? { ...img, uploaded: true } : img))
        );
        setMessage({ 
          type: "success", 
          text: `Photo ${result.image_count} uploaded successfully!` 
        });
      } else {
        console.error("[ERROR] Upload failed:", result);
        setMessage({ 
          type: "error", 
          text: result.error || "Failed to upload image" 
        });
        setCapturedImages((prev) => prev.filter((img) => img.id !== id));
      }
    } catch (error) {
      console.error("[ERROR] Upload exception:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const detailedError = error instanceof TypeError && error.message.includes('fetch')
        ? `Network error: ${errorMessage}. Check if backend is running at ${apiUrl}`
        : errorMessage;
      
      setMessage({ 
        type: "error", 
        text: `Failed to upload image: ${detailedError}` 
      });
      setCapturedImages((prev) => prev.filter((img) => img.id !== id));
    } finally {
      setIsUploading(false);
      console.log("[DEBUG] Upload finished");
    }
  };

  const removeImage = (id: string) => {
    console.log("[DEBUG] removeImage called:", id);
    setCapturedImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id);
      console.log("[DEBUG] Images after removal:", filtered.length);
      return filtered;
    });
  };

  const completeEnrollment = async () => {
    const enrollmentKey = getEnrollmentIdentifier();

    console.log("[DEBUG] completeEnrollment called:", {
      enrollmentKey,
      imageCount: capturedImages.length,
      apiUrl
    });

    if (!enrollmentKey) {
      setMessage({
        type: "error",
        text: "Please provide both name and relationship before completing enrollment."
      });
      setStep("name");
      return;
    }

    if (capturedImages.length === 0) {
      console.warn("[WARN] No images captured");
      setMessage({ 
        type: "error", 
        text: "Please capture at least one photo before completing enrollment." 
      });
      return;
    }

    const uploadedCount = capturedImages.filter(img => img.uploaded).length;
    console.log("[DEBUG] Uploaded images:", uploadedCount, "out of", capturedImages.length);

    setIsTraining(true);
    setMessage(null);

    try {
      const requestBody = { name: enrollmentKey };
      // Use proxy route to avoid CORS issues
      const useProxy = process.env.NODE_ENV === 'production' || apiUrl.includes('165.227.17.154');
      const trainUrl = useProxy ? '/api/train' : `${apiUrl}/train`;
      
      console.log("[DEBUG] Sending training request to:", trainUrl);
      console.log("[DEBUG] Request body:", requestBody);

      const response = await fetch(trainUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("[DEBUG] Training response received:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      let result;
      try {
        result = await response.json();
        console.log("[DEBUG] Training response JSON:", result);
      } catch (jsonError) {
        const text = await response.text();
        console.error("[ERROR] Failed to parse training JSON response:", {
          status: response.status,
          text,
          error: jsonError
        });
        throw new Error(`Server returned invalid JSON (${response.status}): ${text.substring(0, 200)}`);
      }

      if (result.success) {
        console.log("[DEBUG] Training successful:", result);
        setMessage({
          type: "success",
          text: `Enrollment complete! ${result.faces_added} face(s) added. Total faces: ${result.total_faces}`,
        });
        setStep("complete");
        stopCamera();
      } else {
        console.error("[ERROR] Training failed:", result);
        setMessage({ 
          type: "error", 
          text: result.error || "Training failed. Please try again." 
        });
      }
    } catch (error) {
      console.error("[ERROR] Training exception:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const detailedError = error instanceof TypeError && error.message.includes('fetch')
        ? `Network error: ${errorMessage}. Check if backend is running at ${apiUrl}`
        : errorMessage;
      
      setMessage({ 
        type: "error", 
        text: `Failed to complete enrollment: ${detailedError}` 
      });
    } finally {
      setIsTraining(false);
      console.log("[DEBUG] Training finished");
    }
  };

  const resetEnrollment = () => {
    console.log("[DEBUG] resetEnrollment called");
    setName("");
    setRelationship("");
    setStep("name");
    setCapturedImages([]);
    setMessage(null);
    setIsVideoReady(false);
    stopCamera();
  };

  return (
    <div className="flex min-h-screen items-center justify-center font-sans p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <main className="flex w-full max-w-4xl flex-col items-center gap-6 rounded-lg shadow-lg p-6 sm:p-8 relative" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <button
          onClick={handleOpenSettings}
          className="absolute top-4 right-4 p-2 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>Face Enrollment</h1>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'var(--bg-overlay)' }}>
            <div className="rounded-lg shadow-xl p-6 w-full max-w-md" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                API Settings
              </h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="apiUrl" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    API URL
                  </label>
                  <input
                    id="apiUrl"
                    type="text"
                    value={settingsApiUrl}
                    onChange={(e) => {
                      setSettingsApiUrl(e.target.value);
                      setApiTestResult(null); // Clear test result when URL changes
                    }}
                    placeholder="http://138.197.234.202:8080"
                    className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-colors"
                    style={{ 
                      borderColor: 'var(--border-primary)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      '--tw-ring-color': 'var(--focus-ring)'
                    } as React.CSSProperties}
                  />
                </div>

                {/* API Test Button */}
                <button
                  onClick={testApiConnection}
                  disabled={isTestingApi || !settingsApiUrl.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border"
                  style={{ 
                    borderColor: 'var(--border-primary)',
                    backgroundColor: isTestingApi || !settingsApiUrl.trim() ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    opacity: isTestingApi || !settingsApiUrl.trim() ? 0.6 : 1,
                    cursor: isTestingApi || !settingsApiUrl.trim() ? 'not-allowed' : 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                    }
                  }}
                >
                  {isTestingApi ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4" />
                      Test API Connection
                    </>
                  )}
                </button>

                {/* API Test Result */}
                {apiTestResult && (
                  <div
                    className="w-full flex items-start gap-2 p-3 rounded-lg text-sm"
                    style={{
                      backgroundColor: apiTestResult.success ? 'var(--success-bg)' : 'var(--error-bg)',
                      color: apiTestResult.success ? 'var(--success-text)' : 'var(--error-text)'
                    }}
                  >
                    {apiTestResult.success ? (
                      <Wifi className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--success-icon)' }} />
                    ) : (
                      <WifiOff className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--error-icon)' }} />
                    )}
                    <span>{apiTestResult.message}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveSettings}
                    className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                    style={{ 
                      backgroundColor: 'var(--btn-primary)',
                      color: 'var(--text-inverse)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--btn-primary-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--btn-primary)'}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors border"
                    style={{ 
                      borderColor: 'var(--border-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info Panel */}
        {/* <div className="w-full p-3 rounded-lg text-xs font-mono" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <div className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Debug Info:</div>
          <div style={{ color: 'var(--text-primary)' }}>API URL: {apiUrl}</div>
          <div style={{ color: 'var(--text-primary)' }}>Step: {step}</div>
          <div style={{ color: 'var(--text-primary)' }}>Name: {name || '(empty)'}</div>
          <div style={{ color: 'var(--text-primary)' }}>Images: {capturedImages.length} ({capturedImages.filter(img => img.uploaded).length} uploaded)</div>
          <div style={{ color: 'var(--text-primary)' }}>Uploading: {isUploading ? 'Yes' : 'No'}</div>
          <div style={{ color: 'var(--text-primary)' }}>Training: {isTraining ? 'Yes' : 'No'}</div>
          <div style={{ color: 'var(--text-primary)' }}>Stream: {stream ? 'Active' : 'None'}</div>
          <div style={{ color: 'var(--text-primary)' }}>Video Ready: {isVideoReady ? 'Yes' : 'No'}</div>
          {videoRef.current && (
            <div style={{ color: 'var(--text-primary)' }}>
              Video Size: {videoRef.current.videoWidth}x{videoRef.current.videoHeight}
              <br />
              ReadyState: {videoRef.current.readyState} (0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA)
              <br />
              Paused: {videoRef.current.paused ? 'Yes' : 'No'}
              <br />
              Ended: {videoRef.current.ended ? 'Yes' : 'No'}
            </div>
          )}
        </div> */}

        {message && (
          <div
            className="w-full flex items-center gap-2 p-4 rounded-lg"
            style={{
              backgroundColor: message.type === "success" ? 'var(--success-bg)' : 'var(--error-bg)',
              color: message.type === "success" ? 'var(--success-text)' : 'var(--error-text)'
            }}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--success-icon)' }} />
            ) : (
              <AlertCircle className="w-5 h-5" style={{ color: 'var(--error-icon)' }} />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {step === "name" && (
          <div className="w-full flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Enter the person&apos;s name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase())}
                placeholder="John Doe"
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-colors"
                style={{ 
                  borderColor: 'var(--border-primary)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  '--tw-ring-color': 'var(--focus-ring)'
                } as React.CSSProperties}
              />
            </div>
            <div>
              <label htmlFor="relationship" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Relationship to you
              </label>
              <input
                id="relationship"
                type="text"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value.toLowerCase())}
                placeholder="friend"
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-colors"
                style={{ 
                  borderColor: 'var(--border-primary)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  '--tw-ring-color': 'var(--focus-ring)'
                } as React.CSSProperties}
              />
            </div>
            
            {/* Camera Selection - Show before starting */}
            {availableCameras.length > 1 && (
              <div>
                <label htmlFor="camera-select-name" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Select Camera
                </label>
                <div className="flex gap-2">
                  <select
                    id="camera-select-name"
                    value={selectedCameraId || ""}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-colors"
                    style={{ 
                      borderColor: 'var(--border-primary)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      '--tw-ring-color': 'var(--focus-ring)'
                    } as React.CSSProperties}
                  >
                    {availableCameras.map((camera) => (
                      <option key={camera.deviceId} value={camera.deviceId}>
                        {camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={enumerateCameras}
                    className="px-4 py-2 rounded-lg font-medium transition-colors border"
                    style={{ 
                      borderColor: 'var(--border-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title="Refresh camera list"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
            
            <button
              onClick={() => {
                // Enumerate cameras first if not done yet, then start
                if (availableCameras.length === 0) {
                  enumerateCameras().then(() => startCamera());
                } else {
                  startCamera();
                }
              }}
              disabled={!name.trim() || !relationship.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors"
              style={{ 
                backgroundColor: (!name.trim() || !relationship.trim()) ? 'var(--btn-disabled)' : 'var(--btn-primary)',
                color: 'var(--text-inverse)'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = 'var(--btn-primary-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = 'var(--btn-primary)';
                }
              }}
            >
              <Camera className="w-5 h-5" />
              Start Camera
            </button>
          </div>
        )}

        {step === "capture" && (
          <div className="w-full flex flex-col gap-6">
            <div className="relative w-full rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-dark-secondary)', minHeight: '70vh', height: '70vh' }}>
              {!stream && !isStopping && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-2" />
                    <p>Initializing camera...</p>
                  </div>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ display: stream ? 'block' : 'none' }}
                onLoadedMetadata={() => {
                  console.log("[DEBUG] Video metadata loaded");
                  if (videoRef.current) {
                    console.log("[DEBUG] Video dimensions:", {
                      videoWidth: videoRef.current.videoWidth,
                      videoHeight: videoRef.current.videoHeight
                    });
                    if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
                      setIsVideoReady(true);
                    }
                  }
                }}
                onCanPlay={() => {
                  console.log("[DEBUG] Video can play");
                  if (videoRef.current && videoRef.current.videoWidth > 0) {
                    setIsVideoReady(true);
                  }
                }}
                onPlay={() => {
                  console.log("[DEBUG] Video started playing");
                  if (videoRef.current && videoRef.current.videoWidth > 0) {
                    setIsVideoReady(true);
                  }
                }}
                onLoadedData={() => {
                  console.log("[DEBUG] Video data loaded");
                  if (videoRef.current && videoRef.current.videoWidth > 0) {
                    setIsVideoReady(true);
                  }
                }}
                onError={(e) => {
                  console.error("[ERROR] Video error:", e);
                  setIsVideoReady(false);
                }}
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Camera Selection */}
            {availableCameras.length > 1 && (
              <div className="w-full">
                <label htmlFor="camera-select" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Select Camera
                </label>
                <div className="flex gap-2">
                  <select
                    id="camera-select"
                    value={selectedCameraId || ""}
                    onChange={(e) => switchCamera(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-colors"
                    style={{ 
                      borderColor: 'var(--border-primary)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      '--tw-ring-color': 'var(--focus-ring)'
                    } as React.CSSProperties}
                  >
                    {availableCameras.map((camera) => (
                      <option key={camera.deviceId} value={camera.deviceId}>
                        {camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={enumerateCameras}
                    className="px-4 py-2 rounded-lg font-medium transition-colors border"
                    style={{ 
                      borderColor: 'var(--border-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title="Refresh camera list"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={capturePhoto}
                disabled={isUploading || !isVideoReady}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors"
                style={{ 
                  backgroundColor: (isUploading || !isVideoReady) ? 'var(--btn-disabled)' : 'var(--btn-primary)',
                  color: 'var(--text-inverse)'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--btn-primary-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--btn-primary)';
                  }
                }}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    {isVideoReady ? "Capture Photo" : "Waiting for camera..."}
                  </>
                )}
              </button>
              <button
                onClick={stopCamera}
                className="px-6 py-3 rounded-lg font-medium transition-colors border"
                style={{ 
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Stop Camera
              </button>
            </div>

            {capturedImages.length > 0 && (
              <div className="w-full">
                <h2 className="text-lg font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                  Captured Photos ({capturedImages.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {capturedImages.map((img) => (
                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border-2" style={{ borderColor: 'var(--border-primary)' }}>
                      <img src={img.dataUrl} alt="Captured" className="w-full h-full object-cover" />
                      {img.uploaded && (
                        <div className="absolute top-2 right-2 rounded-full p-1" style={{ backgroundColor: 'var(--success-icon)' }}>
                          <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--text-inverse)' }} />
                        </div>
                      )}
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute top-2 left-2 rounded-full p-1 transition-colors"
                        style={{ backgroundColor: 'var(--btn-danger)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--btn-danger-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--btn-danger)'}
                      >
                        <X className="w-4 h-4" style={{ color: 'var(--text-inverse)' }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={completeEnrollment}
              disabled={isTraining || capturedImages.length === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors"
              style={{ 
                backgroundColor: (isTraining || capturedImages.length === 0) ? 'var(--btn-disabled)' : 'var(--btn-success)',
                color: 'var(--text-inverse)'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = 'var(--btn-success-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = 'var(--btn-success)';
                }
              }}
            >
              {isTraining ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Training Model...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Complete Enrollment
                </>
              )}
            </button>
          </div>
        )}

        {step === "complete" && (
          <div className="w-full flex flex-col items-center gap-4">
            <CheckCircle2 className="w-16 h-16" style={{ color: 'var(--success-icon)' }} />
            <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Enrollment Complete!</p>
            <button
              onClick={resetEnrollment}
              className="px-6 py-3 rounded-lg font-medium transition-colors"
              style={{ 
                backgroundColor: 'var(--btn-primary)',
                color: 'var(--text-inverse)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--btn-primary-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--btn-primary)'}
            >
              Enroll Another Person
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
