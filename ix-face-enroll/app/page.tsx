"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Debug: Log API URL configuration
console.log("[DEBUG] API Configuration:", {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  API_URL,
  isClient: typeof window !== "undefined"
});

interface CapturedImage {
  id: string;
  dataUrl: string;
  uploaded: boolean;
}

export default function Home() {
  const [name, setName] = useState("");
  const [step, setStep] = useState<"name" | "capture" | "complete">("name");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Debug: Log API URL on mount
  useEffect(() => {
    console.log("[DEBUG] Component mounted");
    console.log("[DEBUG] API_URL:", API_URL);
    console.log("[DEBUG] NEXT_PUBLIC_API_URL env:", process.env.NEXT_PUBLIC_API_URL);
  }, []);

  useEffect(() => {
    console.log("[DEBUG] Stream changed:", { hasStream: !!stream });
    if (stream && videoRef.current) {
      console.log("[DEBUG] Setting video srcObject and playing");
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((error) => {
        console.error("[ERROR] Failed to play video:", error);
      });
    }
    return () => {
      if (stream) {
        console.log("[DEBUG] Cleaning up stream on unmount");
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Debug: Log state changes
  useEffect(() => {
    console.log("[DEBUG] State update:", {
      step,
      name,
      capturedImagesCount: capturedImages.length,
      uploadedCount: capturedImages.filter(img => img.uploaded).length,
      isUploading,
      isTraining,
      hasStream: !!stream
    });
  }, [step, name, capturedImages, isUploading, isTraining, stream]);

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

  const startCamera = async () => {
    console.log("[DEBUG] startCamera called");
    try {
      console.log("[DEBUG] Requesting camera access...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      });
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

  const stopCamera = () => {
    console.log("[DEBUG] stopCamera called");
    if (stream) {
      console.log("[DEBUG] Stopping stream tracks:", stream.getTracks().length);
      stream.getTracks().forEach((track) => {
        track.stop();
        console.log("[DEBUG] Stopped track:", track.kind);
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      console.log("[DEBUG] Video element cleared");
    }
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
    console.log("[DEBUG] uploadImage called:", { id, name, API_URL });
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
      formData.append("name", name);
      // Use the blob directly, or fixed blob if needed
      const imageBlob = blob.type.startsWith('image/') ? blob : new Blob([blob], { type: 'image/jpeg' });
      formData.append("image", imageBlob, "photo.jpg");
      
      console.log("[DEBUG] FormData created, sending to:", `${API_URL}/enroll`);
      console.log("[DEBUG] FormData entries:", {
        name,
        imageSize: imageBlob.size,
        imageType: imageBlob.type
      });

      const uploadResponse = await fetch(`${API_URL}/enroll`, {
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
        ? `Network error: ${errorMessage}. Check if backend is running at ${API_URL}`
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
    console.log("[DEBUG] completeEnrollment called:", {
      name,
      imageCount: capturedImages.length,
      API_URL
    });

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
      const requestBody = { name };
      console.log("[DEBUG] Sending training request to:", `${API_URL}/train`);
      console.log("[DEBUG] Request body:", requestBody);

      const response = await fetch(`${API_URL}/train`, {
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
        ? `Network error: ${errorMessage}. Check if backend is running at ${API_URL}`
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
    setStep("name");
    setCapturedImages([]);
    setMessage(null);
    stopCamera();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black p-4">
      <main className="flex w-full max-w-4xl flex-col items-center gap-6 bg-white dark:bg-black rounded-lg shadow-lg p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">Face Enrollment</h1>

        {/* Debug Info Panel */}
        {process.env.NODE_ENV === 'development' && (
          <div className="w-full p-3 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-xs font-mono">
            <div className="font-bold mb-1">Debug Info:</div>
            <div>API URL: {API_URL}</div>
            <div>Step: {step}</div>
            <div>Name: {name || '(empty)'}</div>
            <div>Images: {capturedImages.length} ({capturedImages.filter(img => img.uploaded).length} uploaded)</div>
            <div>Uploading: {isUploading ? 'Yes' : 'No'}</div>
            <div>Training: {isTraining ? 'Yes' : 'No'}</div>
            <div>Stream: {stream ? 'Active' : 'None'}</div>
            <div>Video Ready: {isVideoReady ? 'Yes' : 'No'}</div>
            {videoRef.current && (
              <div>
                Video Size: {videoRef.current.videoWidth}x{videoRef.current.videoHeight}
                <br />
                ReadyState: {videoRef.current.readyState} (0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA)
                <br />
                Paused: {videoRef.current.paused ? 'Yes' : 'No'}
                <br />
                Ended: {videoRef.current.ended ? 'Yes' : 'No'}
              </div>
            )}
          </div>
        )}

        {message && (
          <div
            className={`w-full flex items-center gap-2 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {step === "name" && (
          <div className="w-full flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
                Enter your name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={startCamera}
              disabled={!name.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              <Camera className="w-5 h-5" />
              Start Camera
            </button>
          </div>
        )}

        {step === "capture" && (
          <div className="w-full flex flex-col gap-6">
            <div className="relative w-full aspect-video bg-zinc-900 rounded-lg overflow-hidden">
              {!stream && (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-400">
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

            <div className="flex gap-4">
              <button
                onClick={capturePhoto}
                disabled={isUploading || !isVideoReady}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
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
                className="px-6 py-3 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-medium transition-colors"
              >
                Stop Camera
              </button>
            </div>

            {capturedImages.length > 0 && (
              <div className="w-full">
                <h2 className="text-lg font-medium mb-3 text-black dark:text-zinc-50">
                  Captured Photos ({capturedImages.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {capturedImages.map((img) => (
                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border-2 border-zinc-300 dark:border-zinc-700">
                      <img src={img.dataUrl} alt="Captured" className="w-full h-full object-cover" />
                      {img.uploaded && (
                        <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 rounded-full p-1 transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={completeEnrollment}
              disabled={isTraining || capturedImages.length === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
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
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <p className="text-lg font-medium text-black dark:text-zinc-50">Enrollment Complete!</p>
            <button
              onClick={resetEnrollment}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Enroll Another Person
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
