import { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "../utils/logger";

export const useCamera = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const streamRef = useRef(null);

  useEffect(() => {
    const checkSupport = async () => {
      const supported =
        "mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices;
      setIsSupported(supported);

      if (supported) {
        try {
          const mediaDevices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = mediaDevices.filter(
            (device) => device.kind === "videoinput"
          );
          setDevices(videoDevices);

          const backCamera = videoDevices.find(
            (device) =>
              device.label.toLowerCase().includes("back") ||
              device.label.toLowerCase().includes("rear") ||
              device.label.toLowerCase().includes("environment")
          );

          if (backCamera) {
            setCurrentDeviceId(backCamera.deviceId);
          } else if (videoDevices.length > 0) {
            setCurrentDeviceId(videoDevices[0].deviceId);
          }
        } catch (err) {
          logger.warn("Could not enumerate devices:", err);
        }
      }
    };

    checkSupport();
  }, []);

  const startCamera = useCallback(
    async (preferredDeviceId = null) => {
      if (!isSupported) {
        const errorMsg = "Camera not supported";
        setError(errorMsg);
        logger.error(errorMsg);
        return null;
      }

      logger.dev(
        "Starting camera - supported:",
        isSupported,
        "devices:",
        devices.length
      );

      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const constraints = {
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30 },
          },
        };

        if (preferredDeviceId || currentDeviceId) {
          constraints.video.deviceId = preferredDeviceId || currentDeviceId;
        } else {
          constraints.video.facingMode = facingMode;
        }

        logger.dev("Starting camera with constraints:", constraints);

        const mediaStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );

        logger.dev("Camera stream obtained successfully:", !!mediaStream);
        streamRef.current = mediaStream;
        setError(null);

        if ("vibrate" in navigator) {
          navigator.vibrate(50);
        }

        return mediaStream;
      } catch (err) {
        let errorMessage = "Failed to access camera";

        if (err.name === "NotAllowedError") {
          errorMessage = "Camera permission denied";
        } else if (err.name === "NotFoundError") {
          errorMessage = "No camera found";
        } else if (err.name === "NotReadableError") {
          errorMessage = "Camera is already in use";
        }

        setError(errorMessage);
        logger.error("Camera error:", err);
        return null;
      }
    },
    [isSupported, currentDeviceId, facingMode]
  );

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      logger.dev("Stopping camera stream");
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        logger.dev("Track stopped:", track.kind);
      });
      streamRef.current = null;
    }
  }, []);

  const capturePhoto = useCallback((video, options = {}) => {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement("canvas");
        const maxWidth = options.maxWidth || 1280;
        const maxHeight = options.maxHeight || 720;
        const quality = options.quality || 0.8;

        let { videoWidth, videoHeight } = video;

        if (videoWidth > maxWidth || videoHeight > maxHeight) {
          const aspectRatio = videoWidth / videoHeight;

          if (videoWidth > videoHeight) {
            videoWidth = maxWidth;
            videoHeight = maxWidth / aspectRatio;
          } else {
            videoHeight = maxHeight;
            videoWidth = maxHeight * aspectRatio;
          }
        }

        canvas.width = videoWidth;
        canvas.height = videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

        if (options.addTimestamp) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(10, videoHeight - 40, 200, 30);
          ctx.fillStyle = "white";
          ctx.font = "14px Arial";
          ctx.fillText(new Date().toLocaleString(), 15, videoHeight - 20);
        }

        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        if ("vibrate" in navigator) {
          navigator.vibrate([50, 50, 50]);
        }

        logger.dev("Photo captured:", {
          originalSize: `${video.videoWidth}x${video.videoHeight}`,
          finalSize: `${videoWidth}x${videoHeight}`,
          dataSize: Math.round(dataUrl.length / 1024) + "KB",
        });

        resolve({
          data: dataUrl,
          type: "image/jpeg",
          width: videoWidth,
          height: videoHeight,
        });
      } catch (error) {
        logger.error("Error capturing photo:", error);
        resolve(null);
      }
    });
  }, []);

  const switchCamera = useCallback(async () => {
    if (devices.length < 2) return null;

    const newFacingMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacingMode);

    const preferredDevice = devices.find((device) => {
      const label = device.label.toLowerCase();
      if (newFacingMode === "user") {
        return (
          label.includes("front") ||
          label.includes("user") ||
          label.includes("selfie")
        );
      } else {
        return (
          label.includes("back") ||
          label.includes("rear") ||
          label.includes("environment")
        );
      }
    });

    if (preferredDevice) {
      setCurrentDeviceId(preferredDevice.deviceId);
      return startCamera(preferredDevice.deviceId);
    } else {
      return startCamera();
    }
  }, [devices, facingMode, startCamera]);

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      logger.error("Permission denied:", error);
      return false;
    }
  }, []);

  return {
    isSupported,
    stream: streamRef.current,
    error,
    devices,
    currentDeviceId,
    facingMode,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    requestPermission,
    hasMultipleCameras: devices.length > 1,
    isBackCamera: facingMode === "environment",
  };
};
