import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  Plus,
  ReceiptText,
  RefreshCw,
  ScanLine,
  Sparkles,
  SwitchCamera,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { DateLabel, labelForDisplay } from "@/lib/dateRecognition";
import {
  parseReceiptAndLabelText,
  performBrowserOCR,
  SAMPLE_TICKETS,
  ScannedProductResult,
} from "@/lib/ocrScanner";

type ProductStatus = "ok" | "soon" | "expired";
type Product = {
  id: number;
  name: string;
  category: string;
  expiry: string;
  days: number;
  quantity: string;
  status: ProductStatus;
  icon: string;
  location?: string;
  estimated?: boolean;
  dateLabel?: DateLabel;
  corrected?: boolean;
};

interface ScanModalProps {
  onClose: () => void;
  onComplete: (products: Product[]) => void;
  detectIconFn: (name: string, category: string) => string;
}

type ScanInputMethod = "camera" | "upload" | "sample";

const AVAILABLE_CATEGORIES = [
  "Almacén seco",
  "Lácteos",
  "Fiambres y embutidos",
  "Carnes",
  "Pescados y mariscos",
  "Verduras frescas",
  "Frutas frescas",
  "Panadería",
  "Enlatados y conservas",
  "Congelados",
  "Salsas y aderezos",
  "Snacks y galletitas",
  "Bebidas",
  "Café, té y desayuno",
  "Refrigerados preparados",
];

export function ScanModal({ onClose, onComplete, detectIconFn }: ScanModalProps) {
  const [stage, setStage] = useState<"choose" | "scanning" | "results">("choose");
  const [scanMode, setScanMode] = useState<"ticket" | "label">("ticket");
  const [inputMethod, setInputMethod] = useState<ScanInputMethod>("camera");

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

  // OCR state
  const [ocrProgress, setOcrProgress] = useState<{ status: string; progress: number }>({
    status: "Preparando OCR...",
    progress: 0,
  });

  // Results
  const [detectedProducts, setDetectedProducts] = useState<ScannedProductResult[]>([]);

  // Stop camera tracks helper
  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Start camera helper
  const startCamera = async (facing: "environment" | "user" = cameraFacingMode) => {
    stopCameraStream();
    setCameraError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("La cámara no está disponible en este dispositivo o navegador.");
      setInputMethod("upload");
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
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn("Camera access denied or unavailable:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Acceso a la cámara denegado. Podés subir una foto o usar un ticket de prueba."
          : "No se pudo iniciar la cámara en este dispositivo."
      );
      setCameraActive(false);
    }
  };

  // Switch camera between environment (rear) and user (front)
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacingMode === "environment" ? "user" : "environment";
    setCameraFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Initialize camera when entering camera tab
  useEffect(() => {
    if (stage === "choose" && inputMethod === "camera") {
      startCamera();
    } else {
      stopCameraStream();
    }
    return () => stopCameraStream();
  }, [stage, inputMethod]);

  // Capture frame from camera and run OCR
  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    stopCameraStream();
    setStage("scanning");
    setOcrProgress({ status: "Iniciando análisis OCR...", progress: 5 });

    try {
      const { text } = await performBrowserOCR(canvas, (info) => setOcrProgress(info));
      processOCRResult(text);
    } catch (err) {
      console.error("OCR capture failed:", err);
      toast.error("No se pudo leer la imagen capturada. Intentá con mejor luz o un ticket de prueba.");
      setStage("choose");
    }
  };

  // Handle uploaded file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setSelectedImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Process uploaded image with OCR
  const processUploadedImage = async () => {
    if (!selectedImagePreview) return;
    setStage("scanning");
    setOcrProgress({ status: "Iniciando análisis OCR...", progress: 5 });

    try {
      const { text } = await performBrowserOCR(selectedImagePreview, (info) => setOcrProgress(info));
      processOCRResult(text);
    } catch (err) {
      console.error("OCR upload processing failed:", err);
      toast.error("Error al procesar la imagen con OCR.");
      setStage("choose");
    }
  };

  // Process sample ticket
  const runSampleTicket = (sampleText: string) => {
    setStage("scanning");
    setOcrProgress({ status: "Leyendo ticket de prueba...", progress: 60 });
    setTimeout(() => {
      processOCRResult(sampleText);
    }, 450);
  };

  // Process extracted OCR text and transition to results
  const processOCRResult = (text: string) => {
    const parsed = parseReceiptAndLabelText(text, detectIconFn);

    if (parsed.length === 0) {
      // Fallback: If no products matched directly, create a candidate based on detected text lines
      toast("Escaneo finalizado", {
        description: "Se leyó el texto pero no se reconocieron productos estándar. Te sugerimos revisarlos manualmente.",
      });
      setDetectedProducts([
        {
          id: Date.now(),
          name: "Producto escaneado",
          category: "Almacén seco",
          expiry: "25 sep",
          days: 7,
          quantity: "1 unidad",
          status: "ok",
          icon: "📦",
          estimated: true,
          dateLabel: "vencimiento",
          confidence: 60,
        },
      ]);
    } else {
      setDetectedProducts(parsed);
      toast.success("¡Lectura completada!", {
        description: `Se reconocieron ${parsed.length} producto${parsed.length === 1 ? "" : "s"}.`,
      });
    }

    setStage("results");
  };

  // Results editing helpers
  const handleUpdateProduct = (id: number, field: keyof ScannedProductResult, value: any) => {
    setDetectedProducts((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "name" || field === "category") {
          updated.icon = detectIconFn(updated.name, updated.category);
        }
        return updated;
      })
    );
  };

  const handleRemoveProduct = (id: number) => {
    setDetectedProducts((current) => current.filter((p) => p.id !== id));
  };

  const handleAddManualCandidate = () => {
    setDetectedProducts((current) => [
      ...current,
      {
        id: Date.now(),
        name: "Nuevo producto",
        category: "Almacén seco",
        expiry: "25 sep",
        days: 7,
        quantity: "1 unidad",
        status: "ok",
        icon: "📦",
        estimated: true,
        dateLabel: "vencimiento",
        confidence: 100,
      },
    ]);
  };

  const handleConfirmAdd = () => {
    if (detectedProducts.length === 0) {
      onClose();
      return;
    }
    const finalProducts: Product[] = detectedProducts.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      expiry: p.expiry,
      days: p.days,
      quantity: p.quantity,
      status: p.status,
      icon: p.icon,
      estimated: p.estimated,
      dateLabel: p.dateLabel,
    }));

    onComplete(finalProducts);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#142c23]/45 p-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-[560px] overflow-hidden rounded-[28px] border border-white/75 bg-[#fffdf9] shadow-[0_30px_80px_rgba(13,33,25,0.28)] animate-in fade-in zoom-in-95 duration-200">
        {/* Hidden canvas used for camera snapshot capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#eee9df] px-5 py-4">
          <div>
            <p className="font-serif text-xl font-semibold text-[#17372b]">
              {stage === "results" ? "Revisar compra detectada" : "Escaneo OCR inteligente"}
            </p>
            <p className="mt-0.5 text-[12px] text-[#8e978f]">
              {stage === "results"
                ? "Verificá cantidades y fechas antes de guardar"
                : "Lectura de tickets y etiquetas en tu navegador"}
            </p>
          </div>
          <button
            aria-label="Cerrar"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="rounded-full p-2 text-[#8e978f] transition hover:bg-[#f3efe7] hover:text-[#17372b]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stage 1: Choose Source (Camera, File Upload, or Sample) */}
        {stage === "choose" && (
          <div className="p-5">
            {/* Mode: Ticket vs Label */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#f4f0e7] p-1">
              <button
                onClick={() => setScanMode("ticket")}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition ${
                  scanMode === "ticket" ? "bg-white text-[#1f493a] shadow-sm" : "text-[#929990]"
                }`}
              >
                <ReceiptText size={15} /> Ticket de compra
              </button>
              <button
                onClick={() => setScanMode("label")}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition ${
                  scanMode === "label" ? "bg-white text-[#1f493a] shadow-sm" : "text-[#929990]"
                }`}
              >
                <ScanLine size={15} /> Etiqueta / Vto
              </button>
            </div>

            {/* Input Method Selector */}
            <div className="mt-4 flex items-center justify-center gap-2 border-b border-[#eee9df] pb-3 text-[11px] font-semibold">
              <button
                onClick={() => setInputMethod("camera")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  inputMethod === "camera"
                    ? "bg-[#e8f1e7] text-[#2c5c3e] font-bold"
                    : "text-[#7b8e80] hover:bg-[#f6f2e9]"
                }`}
              >
                <Camera size={14} /> Cámara en vivo
              </button>
              <button
                onClick={() => setInputMethod("upload")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  inputMethod === "upload"
                    ? "bg-[#e8f1e7] text-[#2c5c3e] font-bold"
                    : "text-[#7b8e80] hover:bg-[#f6f2e9]"
                }`}
              >
                <Upload size={14} /> Subir foto
              </button>
              <button
                onClick={() => setInputMethod("sample")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  inputMethod === "sample"
                    ? "bg-[#e8f1e7] text-[#2c5c3e] font-bold"
                    : "text-[#7b8e80] hover:bg-[#f6f2e9]"
                }`}
              >
                <Sparkles size={14} className="text-[#d79f38]" /> Tickets muestra
              </button>
            </div>

            {/* Sub-view: Camera */}
            {inputMethod === "camera" && (
              <div className="mt-4">
                {cameraError ? (
                  <div className="rounded-2xl border border-[#f2d4cd] bg-[#fff6f4] p-5 text-center">
                    <p className="text-sm font-semibold text-[#a94c3c]">Aviso sobre la cámara</p>
                    <p className="mt-1 text-[12px] leading-5 text-[#88625b]">{cameraError}</p>
                    <div className="mt-4 flex justify-center gap-2">
                      <button
                        onClick={() => startCamera()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#d6dfd5] bg-white px-3 py-2 text-[11px] font-semibold text-[#305943]"
                      >
                        <RefreshCw size={13} /> Reintentar
                      </button>
                      <button
                        onClick={() => setInputMethod("upload")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#1f493a] px-3 py-2 text-[11px] font-semibold text-white"
                      >
                        <Upload size={13} /> Subir imagen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-[22px] bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-[260px] w-full object-cover"
                    />

                    {/* Viewfinder overlay */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-4">
                      <div className="flex w-full items-center justify-between">
                        <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                          {scanMode === "ticket" ? "Alineá el ticket en el centro" : "Enfocá la fecha de vencimiento"}
                        </span>
                        <button
                          type="button"
                          onClick={toggleCameraFacing}
                          className="pointer-events-auto rounded-full bg-black/60 p-2 text-white backdrop-blur-sm transition hover:bg-black/80"
                          title="Cambiar cámara frontal/trasera"
                        >
                          <SwitchCamera size={16} />
                        </button>
                      </div>

                      <div className="h-36 w-64 rounded-xl border-2 border-dashed border-[#d9e982]/80 bg-[#d9e982]/5" />

                      <span className="rounded-full bg-black/50 px-2 py-0.5 text-[9px] text-white/80">
                        MediaDevices API activa
                      </span>
                    </div>

                    {/* Trigger Button */}
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center px-4">
                      <button
                        onClick={captureAndScan}
                        className="flex items-center gap-2 rounded-xl bg-[#1f493a] px-5 py-2.5 text-[12px] font-bold text-white shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition hover:bg-[#285f4b] active:scale-95"
                      >
                        <ScanLine size={16} /> Capturar y leer con OCR
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sub-view: Upload */}
            {inputMethod === "upload" && (
              <div className="mt-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {selectedImagePreview ? (
                  <div className="rounded-[22px] border border-[#e5ded2] bg-[#fbf9f5] p-4 text-center">
                    <img
                      src={selectedImagePreview}
                      alt="Vista previa"
                      className="mx-auto max-h-48 rounded-xl object-contain shadow-sm"
                    />
                    <div className="mt-4 flex justify-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl border border-[#d6dfd5] bg-white px-3 py-2 text-[11px] font-semibold text-[#506356]"
                      >
                        Cambiar imagen
                      </button>
                      <button
                        onClick={processUploadedImage}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#1f493a] px-4 py-2 text-[11px] font-bold text-white shadow-sm hover:bg-[#16392c]"
                      >
                        <ScanLine size={14} /> Procesar con Tesseract OCR
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer rounded-[22px] border-2 border-dashed border-[#bad0c0] bg-[#f3f8f1] p-8 text-center transition hover:border-[#679973] hover:bg-[#edf5eb]"
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dfeee1] text-[#2d6a4f]">
                      <Upload size={24} strokeWidth={1.8} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[#1d4234]">Subí una foto de tu ticket o envase</p>
                    <p className="mt-1 text-[11px] text-[#788d7f]">Hacé clic para seleccionar archivo JPG, PNG o WEBP</p>
                    <span className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-[10px] font-bold text-[#2d6a4f] shadow-sm">
                      Seleccionar imagen
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Sub-view: Samples */}
            {inputMethod === "sample" && (
              <div className="mt-4 space-y-2">
                <p className="text-[11px] text-[#7a887d]">
                  Probá el motor OCR inmediatamente con estos ejemplos representativos:
                </p>
                {SAMPLE_TICKETS.map((sample, idx) => (
                  <button
                    key={sample.name}
                    onClick={() => runSampleTicket(sample.text)}
                    className="flex w-full items-center justify-between rounded-2xl border border-[#ebe5da] bg-[#faf8f3] p-3.5 text-left transition hover:border-[#b8d6be] hover:bg-[#f1f7ef]"
                  >
                    <div>
                      <p className="text-[12px] font-bold text-[#1f493a]">{sample.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-[#8e988f] font-mono">
                        {sample.text.replace(/\n+/g, " · ").slice(0, 70)}...
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-[#8e988f]" />
                  </button>
                ))}
              </div>
            )}

            <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#8e978f]">
              <Sparkles size={12} className="text-[#d6a143]" /> Motor Tesseract.js integrado · Reconocimiento local
            </p>
          </div>
        )}

        {/* Stage 2: Scanning Progress */}
        {stage === "scanning" && (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#e5f0e5] text-[#2d6a4f]">
              <LoaderCircle size={38} className="animate-spin" strokeWidth={1.6} />
              <span className="absolute inset-0 animate-ping rounded-[24px] border border-[#9fc4a7] opacity-30" />
            </div>
            <p className="mt-5 font-serif text-2xl font-semibold text-[#17372b]">Procesando compra...</p>
            <p className="mt-1 text-[12px] text-[#87948a]">{ocrProgress.status}</p>

            <div className="mt-6 h-2 w-56 overflow-hidden rounded-full bg-[#e6eee5]">
              <div
                className="h-full rounded-full bg-[#5d9b72] transition-all duration-300"
                style={{ width: `${Math.max(10, ocrProgress.progress)}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] font-bold text-[#5d9b72]">{ocrProgress.progress}%</p>
            <p className="mt-4 max-w-xs text-[10px] text-[#97a398]">
              Extrayendo productos, cantidades e identificando fechas de vencimiento con catálogo regional.
            </p>
          </div>
        )}

        {/* Stage 3: Results & Editing */}
        {stage === "results" && (
          <div className="max-h-[75vh] overflow-y-auto p-5">
            <div className="flex items-start gap-3 rounded-2xl bg-[#e7f1e9] p-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#cae3cf] text-[#2d6a4f]">
                <Check size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#1e4b38]">
                  {detectedProducts.length} producto{detectedProducts.length === 1 ? "" : "s"} detectado
                  {detectedProducts.length === 1 ? "" : "s"}
                </p>
                <p className="text-[10px] text-[#6f8978]">
                  Podés editar el nombre, cantidad o fecha antes de ingresar a tu despensa.
                </p>
              </div>
              <button
                onClick={handleAddManualCandidate}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-[#c2dac7] bg-white px-2 py-1 text-[10px] font-bold text-[#2d6a4f]"
              >
                <Plus size={12} /> Agregar
              </button>
            </div>

            {/* List of Scanned Products */}
            <div className="mt-4 divide-y divide-[#eee9df] rounded-2xl border border-[#eee9df] bg-white px-3">
              {detectedProducts.map((product) => (
                <div key={product.id} className="py-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f6f1e7] text-xl">
                      {product.icon}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          value={product.name}
                          onChange={(e) => handleUpdateProduct(product.id, "name", e.target.value)}
                          className="w-full rounded-lg border border-[#e8e4db] px-2 py-1 text-[12px] font-semibold text-[#294338] outline-none focus:border-[#4c845d]"
                          placeholder="Nombre del producto"
                        />
                        <button
                          onClick={() => handleRemoveProduct(product.id)}
                          className="rounded-lg p-1 text-[#a5aca5] hover:bg-[#fceeed] hover:text-[#c45341]"
                          title="Quitar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <label className="text-[9px] font-semibold uppercase text-[#96a096]">Cantidad</label>
                          <input
                            value={product.quantity}
                            onChange={(e) => handleUpdateProduct(product.id, "quantity", e.target.value)}
                            className="mt-0.5 w-full rounded-lg border border-[#e8e4db] px-2 py-1 text-[11px] text-[#4d5c52] outline-none"
                            placeholder="ej. 1 litro"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-semibold uppercase text-[#96a096]">Categoría</label>
                          <select
                            value={product.category}
                            onChange={(e) => handleUpdateProduct(product.id, "category", e.target.value)}
                            className="mt-0.5 w-full rounded-lg border border-[#e8e4db] bg-white px-1.5 py-1 text-[11px] text-[#4d5c52] outline-none"
                          >
                            {AVAILABLE_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[10px]">
                        <span className="text-[#78887b]">
                          {labelForDisplay(product.dateLabel || "desconocida")}:{" "}
                          <strong className="text-[#2c473a]">{product.expiry}</strong>
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                            product.estimated
                              ? "bg-[#eaf4ea] text-[#487e58]"
                              : "bg-[#fbf1db] text-[#9b7224]"
                          }`}
                        >
                          {product.estimated ? "vida útil estimada" : "detectado en envase"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setStage("choose")}
                className="flex-1 rounded-xl border border-[#dfe3db] px-4 py-3 text-[12px] font-semibold text-[#657268] transition hover:bg-[#f6f3ed]"
              >
                Volver a escanear
              </button>
              <button
                onClick={handleConfirmAdd}
                className="flex-1 rounded-xl bg-[#1f493a] px-4 py-3 text-[12px] font-bold text-white transition hover:bg-[#16392c] active:scale-[0.97]"
              >
                Agregar a despensa ({detectedProducts.length})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
