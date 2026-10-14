import { useState, useRef, useEffect, useCallback } from "react";

export function useCameraStream() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCameraStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: "environment" | "user" = cameraFacingMode) => {
    stopCameraStream();
    setCameraError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("La cámara no está disponible en este dispositivo o navegador.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Camera access denied or unavailable:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Acceso a la cámara denegado. Podés subir una foto o usar un ticket de prueba."
          : "No se pudo iniciar la cámara en este dispositivo."
      );
    }
  }, [cameraFacingMode, stopCameraStream]);

  const toggleCameraFacing = useCallback(() => {
    const nextFacing = cameraFacingMode === "environment" ? "user" : "environment";
    setCameraFacingMode(nextFacing);
    startCamera(nextFacing);
  }, [cameraFacingMode, startCamera]);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  return {
    videoRef,
    canvasRef,
    cameraFacingMode,
    cameraError,
    startCamera,
    stopCameraStream,
    toggleCameraFacing,
    setCameraError,
  };
}
