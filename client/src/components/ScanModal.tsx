import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronRight,
  LoaderCircle,
  Plus,
  ReceiptText,
  RefreshCw,
  ScanBarcode,
  ScanLine,
  Search,
  Sparkles,
  SwitchCamera,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useCameraStream } from "@/hooks/useCameraStream";
import { labelForDisplay } from "@/lib/dateRecognition";
import {
  parseReceiptAndLabelText,
  performBrowserOCR,
  SAMPLE_TICKETS,
  ScannedProductResult,
} from "@/lib/ocrScanner";
import { StoredProduct } from "@/types/product";
import { ALL_CATEGORIES } from "@/lib/categories";
import { addDaysISO } from "@/lib/dates";
import { saveLastScan } from "@/lib/storage";
import { estimateShelfLife } from "@/lib/shelfLifeCatalog";
import {
  fetchProductByBarcode,
  detectBarcodeFromImageSource,
} from "@/lib/barcodeScanner";
import { playChimeSound, triggerHaptic } from "@/lib/feedback";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

interface ScanModalProps {
  onClose: () => void;
  onComplete: (products: StoredProduct[]) => void;
  detectIconFn: (name: string, category: string) => string;
}

type ScanInputMethod = "camera" | "upload" | "sample";

export function ScanModal({ onClose, onComplete, detectIconFn }: ScanModalProps) {
  const [stage, setStage] = useState<"choose" | "scanning" | "results">("choose");
  const [scanMode, setScanMode] = useState<"ticket" | "label" | "barcode">("ticket");
  const [inputMethod, setInputMethod] = useState<ScanInputMethod>("camera");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isSearchingBarcode, setIsSearchingBarcode] = useState(false);

  // Camera stream hook
  const {
    videoRef,
    canvasRef,
    cameraError,
    startCamera,
    stopCameraStream,
    toggleCameraFacing,
  } = useCameraStream();

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

  const handleRequestClose = () => {
    if (stage === "scanning") {
      const confirmClose = window.confirm(
        "El escaneo está en curso. ¿Seguro que querés cancelar?"
      );
      if (!confirmClose) return;
    }
    stopCameraStream();
    onClose();
  };

  // Initialize camera when entering camera tab
  useEffect(() => {
    if (stage === "choose" && inputMethod === "camera") {
      startCamera();
    } else {
      stopCameraStream();
    }
  }, [stage, inputMethod, startCamera, stopCameraStream]);

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
    } catch (err: any) {
      console.error("OCR capture failed:", err);
      toast.error(err?.message || "No se pudo inicializar el escáner");
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
    } catch (err: any) {
      console.error("OCR upload processing failed:", err);
      toast.error(err?.message || "No se pudo inicializar el escáner");
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

  // Barcode lookup via OpenFoodFacts
  const handleLookupBarcode = async (codeToLookup?: string) => {
    const code = (codeToLookup || barcodeInput).trim();
    if (!code) {
      toast.error("Ingresá un código de barras");
      return;
    }
    stopCameraStream();
    setIsSearchingBarcode(true);
    setStage("scanning");
    setOcrProgress({ status: `Consultando base OpenFoodFacts (${code})...`, progress: 50 });

    try {
      const result = await fetchProductByBarcode(code);
      if (result) {
        playChimeSound("scan");
        triggerHaptic();
        setDetectedProducts([
          {
            id: Date.now(),
            name: result.name,
            category: result.category,
            expiryDate: result.expiryDate,
            quantity: result.quantity,
            icon: result.icon,
            location: result.location,
            estimated: true,
            dateLabel: "vencimiento",
            confidence: 98,
          },
        ]);
        toast.success("¡Producto reconocido!", {
          description: `${result.name} · ${result.category}`,
        });
        setStage("results");
      } else {
        toast.error("Código no encontrado", {
          description: "No se encontró en Open Food Facts. Podés ingresarlo manualmente.",
        });
        setStage("choose");
      }
    } catch {
      toast.error("Error al consultar el código");
      setStage("choose");
    } finally {
      setIsSearchingBarcode(false);
    }
  };

  // Barcode live scan from camera stream
  const handleScanBarcodeFromCamera = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const detectedCode = await detectBarcodeFromImageSource(canvas);
    if (detectedCode) {
      handleLookupBarcode(detectedCode);
    } else {
      toast("No se detectó un código en el recuadro", {
        description: "Probá acercando más el código de barras o escribí los dígitos abajo.",
        icon: "🔍",
      });
    }
  };

  // Process extracted OCR text and transition to results
  const processOCRResult = (text: string) => {
    playChimeSound("success");
    triggerHaptic();
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
          expiryDate: addDaysISO(7),
          quantity: "1 unidad",
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
        if (field === "category" && item.estimated) {
          const estimate = estimateShelfLife(updated.name, "cerrado", value);
          if (estimate) {
            updated.expiryDate = addDaysISO(estimate.days);
          }
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
        expiryDate: addDaysISO(7),
        quantity: "1 unidad",
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
    const finalProducts: StoredProduct[] = detectedProducts.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      expiryDate: p.expiryDate,
      quantity: p.quantity,
      icon: p.icon,
      location: p.location,
      estimated: p.estimated,
      dateLabel: p.dateLabel,
    }));

    playChimeSound("success");
    triggerHaptic();
    saveLastScan({ at: new Date().toISOString(), count: finalProducts.length });
    onComplete(finalProducts);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) handleRequestClose(); }}>
      <DialogContent
        hideCloseButton
        aria-describedby="scan-modal-desc"
        onPointerDownOutside={(e) => {
          if (stage === "scanning") {
            e.preventDefault();
            handleRequestClose();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (stage === "scanning") {
            e.preventDefault();
            handleRequestClose();
          }
        }}
        className="max-w-[560px] p-0 overflow-hidden"
      >
        {/* Hidden canvas used for camera snapshot capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <DialogTitle className="font-display text-xl font-bold tracking-tight text-content">
              {stage === "results"
                ? "Revisar compra detectada"
                : scanMode === "barcode"
                ? "Escanear código de barras"
                : "Escaneo OCR inteligente"}
            </DialogTitle>
            <DialogDescription id="scan-modal-desc" className="mt-0.5 text-xs text-content-muted">
              {stage === "results"
                ? "Verificá cantidades y fechas antes de guardar"
                : scanMode === "barcode"
                ? "Buscá alimentos por su código EAN en la base global OpenFoodFacts."
                : "El reconocimiento de texto corre en tu dispositivo, sin conexión."}
            </DialogDescription>
          </div>
          <button
            aria-label="Cerrar modal de escaneo"
            onClick={handleRequestClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-content-muted transition hover:bg-surface-elevated hover:text-content"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stage 1: Choose Source (Camera, File Upload, or Sample) */}
        {stage === "choose" && (
          <div className="p-5">
            {/* Mode: Ticket vs Label vs Barcode */}
            <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-surface-elevated p-1">
              <button
                type="button"
                onClick={() => setScanMode("ticket")}
                className={`min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition ${
                  scanMode === "ticket" ? "bg-surface text-brand shadow-sm font-bold" : "text-content-muted"
                }`}
              >
                <ReceiptText size={14} /> Ticket
              </button>
              <button
                type="button"
                onClick={() => setScanMode("label")}
                className={`min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition ${
                  scanMode === "label" ? "bg-surface text-brand shadow-sm font-bold" : "text-content-muted"
                }`}
              >
                <ScanLine size={14} /> Etiqueta
              </button>
              <button
                type="button"
                onClick={() => setScanMode("barcode")}
                className={`min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition ${
                  scanMode === "barcode" ? "bg-surface text-brand shadow-sm font-bold" : "text-content-muted"
                }`}
              >
                <ScanBarcode size={14} /> Código barras
              </button>
            </div>

            {/* Input Method Selector */}
            <div className="mt-4 flex items-center justify-center gap-2 border-b border-line pb-3 text-xs font-semibold">
              <button
                onClick={() => setInputMethod("camera")}
                className={`min-h-[44px] flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  inputMethod === "camera"
                    ? "bg-brand-subtle text-brand font-bold"
                    : "text-content-muted hover:bg-surface-elevated"
                }`}
              >
                <Camera size={14} /> Cámara en vivo
              </button>
              <button
                onClick={() => setInputMethod("upload")}
                className={`min-h-[44px] flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  inputMethod === "upload"
                    ? "bg-brand-subtle text-brand font-bold"
                    : "text-content-muted hover:bg-surface-elevated"
                }`}
              >
                <Upload size={14} /> Subir foto
              </button>
              <button
                onClick={() => setInputMethod("sample")}
                className={`min-h-[44px] flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  inputMethod === "sample"
                    ? "bg-brand-subtle text-brand font-bold"
                    : "text-content-muted hover:bg-surface-elevated"
                }`}
              >
                <Sparkles size={14} className="text-status-soon-dot" /> Tickets muestra
              </button>
            </div>

            {/* Sub-view: Camera */}
            {inputMethod === "camera" && (
              <div className="mt-4">
                {cameraError ? (
                  <div className="rounded-2xl border border-status-expired-border bg-status-expired-bg/40 p-5 text-center">
                    <p className="text-sm font-semibold text-status-expired-text">Aviso sobre la cámara</p>
                    <p className="mt-1 text-xs leading-5 text-content-body">{cameraError}</p>
                    <div className="mt-4 flex justify-center gap-2">
                      <button
                        onClick={() => startCamera()}
                        className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-brand"
                      >
                        <RefreshCw size={13} /> Reintentar
                      </button>
                      <button
                        onClick={() => setInputMethod("upload")}
                        className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white"
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
                        <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                          {scanMode === "ticket" ? "Alineá el ticket en el centro" : "Enfocá la fecha de vencimiento"}
                        </span>
                        <button
                          type="button"
                          onClick={toggleCameraFacing}
                          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80"
                          aria-label="Cambiar cámara frontal o trasera"
                          title="Cambiar cámara frontal/trasera"
                        >
                          <SwitchCamera size={16} />
                        </button>
                      </div>

                      <div className="h-36 w-64 rounded-xl border-2 border-dashed border-accent-lime/80 bg-accent-lime/5" />

                      <span className="rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
                        MediaDevices API activa
                      </span>
                    </div>

                    {/* Trigger Button */}
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center px-4">
                      {scanMode === "barcode" ? (
                        <button
                          type="button"
                          onClick={handleScanBarcodeFromCamera}
                          className="min-h-[44px] flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-brand-hover active:scale-95"
                        >
                          <ScanBarcode size={16} /> Escanear código con cámara
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={captureAndScan}
                          className="min-h-[44px] flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-brand-hover active:scale-95"
                        >
                          <ScanLine size={16} /> Capturar y leer con OCR
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Direct Barcode Entry when in Barcode Mode */}
                {scanMode === "barcode" && (
                  <div className="mt-4 rounded-2xl border border-line bg-surface p-4 space-y-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-content-muted">
                        Búsqueda directa EAN-13 / UPC
                      </span>
                      <div className="mt-1.5 flex gap-2">
                        <input
                          type="text"
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleLookupBarcode();
                          }}
                          placeholder="Ej: 7790742330800 o pegar código..."
                          className="flex-1 rounded-xl border border-line bg-surface-subtle px-3.5 py-2 text-xs text-content outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                        />
                        <button
                          type="button"
                          onClick={() => handleLookupBarcode()}
                          disabled={isSearchingBarcode}
                          className="btn-3d inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-50"
                        >
                          {isSearchingBarcode ? (
                            <LoaderCircle size={14} className="animate-spin" />
                          ) : (
                            <Search size={14} />
                          )}
                          Buscar
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-content-muted">
                        Probar con alimentos comunes:
                      </span>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {[
                          { name: "🥛 Leche Ilolay", code: "7790742330800" },
                          { name: "🍪 Criollitas", code: "7790070411707" },
                          { name: "🍚 Arroz Lucchetti", code: "7790387011400" },
                          { name: "🍝 Fideos Matarazzo", code: "7790070318532" },
                          { name: "🐟 Atún La Campagnola", code: "7790070509657" },
                        ].map((sample) => (
                          <button
                            key={sample.code}
                            type="button"
                            onClick={() => {
                              setBarcodeInput(sample.code);
                              handleLookupBarcode(sample.code);
                            }}
                            className="rounded-lg border border-brand-border/60 bg-brand-subtle px-2.5 py-1 text-[11px] font-semibold text-brand-text hover:bg-brand/10 transition"
                          >
                            {sample.name}
                          </button>
                        ))}
                      </div>
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
                  <div className="rounded-[22px] border border-line bg-surface-muted p-4 text-center">
                    <img
                      src={selectedImagePreview}
                      alt="Vista previa"
                      className="mx-auto max-h-48 rounded-xl object-contain shadow-sm"
                    />
                    <div className="mt-4 flex justify-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="min-h-[44px] rounded-xl border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-content-body"
                      >
                        Cambiar imagen
                      </button>
                      <button
                        onClick={processUploadedImage}
                        className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-hover"
                      >
                        <ScanLine size={14} /> Procesar con Tesseract OCR
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer rounded-[22px] border-2 border-dashed border-brand-border bg-brand-subtle/40 p-8 text-center transition hover:border-brand hover:bg-brand-subtle"
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-subtle text-brand">
                      <Upload size={24} strokeWidth={1.8} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-brand">Subí una foto de tu ticket o envase</p>
                    <p className="mt-1 text-xs text-content-muted">Hacé clic para seleccionar archivo JPG, PNG o WEBP</p>
                    <span className="mt-3 inline-block rounded-full bg-surface px-3 py-1 text-xs font-bold text-brand shadow-sm border border-line">
                      Seleccionar imagen
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Sub-view: Samples */}
            {inputMethod === "sample" && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-content-muted">
                  Probá el motor OCR inmediatamente con estos ejemplos representativos:
                </p>
                {SAMPLE_TICKETS.map((sample) => (
                  <button
                    key={sample.name}
                    onClick={() => runSampleTicket(sample.text)}
                    className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface-elevated p-3.5 text-left transition hover:border-brand-border hover:bg-brand-subtle"
                  >
                    <div>
                      <p className="text-xs font-bold text-brand">{sample.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-content-muted font-mono">
                        {sample.text.replace(/\n+/g, " · ").slice(0, 70)}...
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-content-muted" />
                  </button>
                ))}
              </div>
            )}

            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-content-muted">
              <Sparkles size={12} className="text-status-soon-dot" /> Motor Tesseract.js integrado · Reconocimiento local
            </p>
          </div>
        )}

        {/* Stage 2: Scanning Progress */}
        {stage === "scanning" && (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] bg-brand-subtle text-brand">
              <LoaderCircle size={38} className="animate-spin" strokeWidth={1.6} />
              <span className="absolute inset-0 animate-ping rounded-[24px] border border-brand-border opacity-30" />
            </div>
            <p className="mt-5 font-display text-2xl font-bold tracking-tight text-content">Procesando compra...</p>
            <p className="mt-1 text-xs text-content-muted">{ocrProgress.status}</p>

            <div className="mt-6 h-2 w-56 overflow-hidden rounded-full bg-brand-subtle">
              <div
                className="h-full rounded-full bg-status-ok-dot transition-all duration-300"
                style={{ width: `${Math.max(10, ocrProgress.progress)}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-bold text-status-ok-text">{ocrProgress.progress}%</p>
            <p className="mt-4 max-w-xs text-xs text-content-muted">
              Extrayendo productos, cantidades e identificando fechas de vencimiento con catálogo regional.
            </p>
          </div>
        )}

        {/* Stage 3: Results & Editing */}
        {stage === "results" && (
          <div className="max-h-[75vh] overflow-y-auto p-5">
            <div className="flex items-start gap-3 rounded-2xl bg-brand-subtle p-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-brand">
                <Check size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-brand">
                  {detectedProducts.length} producto{detectedProducts.length === 1 ? "" : "s"} detectado
                  {detectedProducts.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-content-muted">
                  Podés editar el nombre, cantidad o fecha antes de ingresar a tu despensa.
                </p>
              </div>
              <button
                onClick={handleAddManualCandidate}
                className="min-h-[44px] shrink-0 inline-flex items-center gap-1 rounded-lg border border-brand-border bg-surface px-3 py-1.5 text-xs font-bold text-brand hover:bg-surface-elevated"
              >
                <Plus size={12} /> Agregar
              </button>
            </div>

            {/* List of Scanned Products */}
            <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface px-3">
              {detectedProducts.map((product) => (
                <div key={product.id} className="py-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-elevated text-xl">
                      {product.icon}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          value={product.name}
                          onChange={(e) => handleUpdateProduct(product.id, "name", e.target.value)}
                          className="w-full rounded-lg border border-line-strong bg-surface px-2 py-1 text-xs font-semibold text-content outline-none focus:border-brand"
                          placeholder="Nombre del producto"
                        />
                        <button
                          onClick={() => handleRemoveProduct(product.id)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-content-muted hover:bg-status-expired-bg hover:text-status-expired-text"
                          aria-label={`Quitar ${product.name}`}
                          title="Quitar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-xs font-semibold uppercase text-content-muted">Cantidad</label>
                          <input
                            value={product.quantity}
                            onChange={(e) => handleUpdateProduct(product.id, "quantity", e.target.value)}
                            className="mt-0.5 w-full rounded-lg border border-line-strong bg-surface px-2 py-1 text-xs text-content-body outline-none"
                            placeholder="ej. 1 litro"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-content-muted">Categoría</label>
                          <select
                            value={product.category}
                            onChange={(e) => handleUpdateProduct(product.id, "category", e.target.value)}
                            className="mt-0.5 w-full rounded-lg border border-line-strong bg-surface px-1.5 py-1 text-xs text-content-body outline-none"
                          >
                            {ALL_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-content-muted">
                            {labelForDisplay(product.dateLabel || "desconocida")}:
                          </span>
                          <input
                            type="date"
                            value={product.expiryDate}
                            onChange={(e) => handleUpdateProduct(product.id, "expiryDate", e.target.value)}
                            className="rounded-lg border border-line-strong bg-surface px-2 py-0.5 text-xs font-semibold text-content outline-none focus:border-brand"
                          />
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            product.estimated
                              ? "bg-status-ok-bg text-status-ok-text"
                              : "bg-status-soon-bg text-status-soon-text"
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
                className="min-h-[44px] flex-1 rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-content-body transition hover:bg-surface-elevated"
              >
                Volver a escanear
              </button>
              <button
                onClick={handleConfirmAdd}
                className="min-h-[44px] flex-1 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white transition hover:bg-brand-hover active:scale-[0.97]"
              >
                Agregar a despensa ({detectedProducts.length})
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
