import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  WifiOff,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  detectUserPlatform,
  DetectedPlatform,
  isStandaloneMode,
  promptPWAInstall,
} from "@/lib/pwaAndNotifications";
import { playChimeSound, triggerHaptic } from "@/lib/feedback";

export interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  canInstall?: boolean;
  onInstall?: () => Promise<boolean>;
}

type TabPlatform = "android" | "ios" | "windows" | "linux";

export function InstallAppModal({
  isOpen,
  onClose,
  canInstall = false,
  onInstall,
}: InstallAppModalProps) {
  const [detectedPlatform, setDetectedPlatform] = useState<DetectedPlatform>("other");
  const [selectedPlatform, setSelectedPlatform] = useState<TabPlatform>("android");
  const [isStandalone, setIsStandalone] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const detected = detectUserPlatform();
    setDetectedPlatform(detected);
    setIsStandalone(isStandaloneMode());

    // Auto-select detected platform tab
    if (detected === "ios") {
      setSelectedPlatform("ios");
    } else if (detected === "windows") {
      setSelectedPlatform("windows");
    } else if (detected === "linux") {
      setSelectedPlatform("linux");
    } else {
      setSelectedPlatform("android");
    }
  }, [isOpen]);

  const handleInstallClick = async () => {
    try {
      setIsInstalling(true);
      triggerHaptic();
      const installer = onInstall || promptPWAInstall;
      const success = await installer();
      setIsInstalling(false);
      if (success) {
        playChimeSound("success");
        toast.success("¡Instalación iniciada!", {
          description: "FreshTrack se agregó a tu dispositivo.",
        });
        onClose();
      }
    } catch {
      setIsInstalling(false);
      toast.error("No se pudo iniciar la instalación automática.");
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = typeof window !== "undefined" ? window.location.origin : "https://freshtrack.app";
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      playChimeSound("pop");
      triggerHaptic();
      toast.success("Enlace copiado al portapapeles", {
        description: "Abrilo en el navegador de tu celular para instalarlo.",
      });
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error("No se pudo copiar el enlace.");
    }
  };

  const isCurrentPlatformSelected = useMemo(() => {
    if (detectedPlatform === "ios" && selectedPlatform === "ios") return true;
    if (detectedPlatform === "android" && selectedPlatform === "android") return true;
    if (detectedPlatform === "windows" && selectedPlatform === "windows") return true;
    if (detectedPlatform === "linux" && selectedPlatform === "linux") return true;
    return false;
  }, [detectedPlatform, selectedPlatform]);

  const isMobileTab = selectedPlatform === "android" || selectedPlatform === "ios";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[560px] p-0 overflow-hidden rounded-[28px] border-line bg-surface shadow-2xl">
        {/* App Store Style Hero Header */}
        <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 sm:p-6 pb-6">
          {/* Subtle Ambient Radial Glow */}
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none"
          />

          <DialogHeader className="relative z-10 text-left space-y-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                {/* App Squircle Icon */}
                <div className="relative flex h-16 w-16 sm:h-18 sm:w-18 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-tr from-white to-emerald-50 text-emerald-700 shadow-lg border border-white/40 ring-4 ring-emerald-500/30">
                  <span className="text-3xl sm:text-4xl filter drop-shadow-xs">🌱</span>
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold border border-white">
                    ✓
                  </span>
                </div>

                {/* Title & Metadata */}
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white mb-1">
                    <Sparkles size={11} /> {isMobileTab ? "Aplicación Móvil PWA" : "Aplicación de Escritorio"}
                  </div>
                  <DialogTitle className="font-display text-xl sm:text-2xl font-black text-white leading-tight">
                    FreshTrack
                  </DialogTitle>
                  <DialogDescription className="text-xs text-emerald-100/90 font-medium">
                    Control de Vencimientos y Cocina Inteligente
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Store Badges Row */}
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-center gap-2 text-white">
              <div className="flex-1">
                <p className="text-xs font-black sm:text-sm text-emerald-200">100% Offline</p>
                <p className="text-[10px] text-emerald-200/80 font-medium">Sin datos móviles</p>
              </div>
              <div className="h-6 w-px bg-white/20" />
              <div className="flex-1">
                <p className="text-xs font-black sm:text-sm text-emerald-200">&lt; 3 MB</p>
                <p className="text-[10px] text-emerald-200/80 font-medium">Súper ligera</p>
              </div>
              <div className="h-6 w-px bg-white/20" />
              <div className="flex-1">
                <p className="text-xs font-black sm:text-sm text-emerald-200">Privada</p>
                <p className="text-[10px] text-emerald-200/80 font-medium">Sin registro</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Platform Selector Tabs */}
        <div className="px-4 sm:px-6 pt-3 pb-1 border-b border-line bg-surface-subtle">
          <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted mb-2">
            Elegí tu sistema operativo:
          </p>
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-surface border border-line">
            {/* Android Tab */}
            <button
              type="button"
              onClick={() => setSelectedPlatform("android")}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold transition-all ${
                selectedPlatform === "android"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-content-muted hover:text-content hover:bg-surface-muted"
              }`}
            >
              <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.082 12 8.082s-3.5902.3296-5.1368.8677L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
              </svg>
              <span>Android</span>
            </button>

            {/* iOS Tab */}
            <button
              type="button"
              onClick={() => setSelectedPlatform("ios")}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold transition-all ${
                selectedPlatform === "ios"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs"
                  : "text-content-muted hover:text-content hover:bg-surface-muted"
              }`}
            >
              <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.64 1.35-.57.65-1.07 1.72-.94 2.75 1.01.08 2.03-.5 2.66-1.25z" />
              </svg>
              <span>iOS</span>
            </button>

            {/* Windows Tab */}
            <button
              type="button"
              onClick={() => setSelectedPlatform("windows")}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold transition-all ${
                selectedPlatform === "windows"
                  ? "bg-sky-700 text-white shadow-xs"
                  : "text-content-muted hover:text-content hover:bg-surface-muted"
              }`}
            >
              <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
              </svg>
              <span>Windows</span>
            </button>

            {/* Linux Tab */}
            <button
              type="button"
              onClick={() => setSelectedPlatform("linux")}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold transition-all ${
                selectedPlatform === "linux"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-content-muted hover:text-content hover:bg-surface-muted"
              }`}
            >
              <Terminal size={14} className="shrink-0" />
              <span>Linux</span>
            </button>
          </div>
        </div>

        {/* Tab Body Contents */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Current Device Detection Callout */}
          {isCurrentPlatformSelected && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-2.5 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              <Zap size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Detectamos que estás navegando desde este dispositivo.</span>
            </div>
          )}

          {isStandalone && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 p-3 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>¡Genial! FreshTrack ya está ejecutándose como aplicación instalada.</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* SPECIAL MOBILE FORMAT: HIGHLIGHTED SUPERPOWERS CARD       */}
          {/* ========================================================= */}
          {isMobileTab && (
            <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-50/70 via-surface to-emerald-50/30 dark:from-emerald-950/40 dark:via-surface dark:to-emerald-950/15 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
                <span className="flex items-center gap-1.5">
                  <Smartphone size={14} className="text-emerald-600 dark:text-emerald-400" />
                  Experiencia Móvil Optimizada
                </span>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] px-2 py-0.5 font-bold uppercase">
                  {selectedPlatform === "android" ? "Google Play Look" : "Apple iOS Look"}
                </span>
              </div>

              {/* 4-Item Mobile Benefits Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-start gap-1.5 rounded-xl bg-surface/90 border border-line p-2 shadow-2xs">
                  <Camera size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-content-heading font-semibold">Cámara &amp; OCR</strong>
                    <span className="text-content-muted leading-tight">Escaneo de tickets y códigos en el súper</span>
                  </div>
                </div>

                <div className="flex items-start gap-1.5 rounded-xl bg-surface/90 border border-line p-2 shadow-2xs">
                  <WifiOff size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-content-heading font-semibold">100% Offline</strong>
                    <span className="text-content-muted leading-tight">Sin gastar tus datos móviles</span>
                  </div>
                </div>

                <div className="flex items-start gap-1.5 rounded-xl bg-surface/90 border border-line p-2 shadow-2xs">
                  <Bell size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-content-heading font-semibold">Alertas Push</strong>
                    <span className="text-content-muted leading-tight">Aviso antes de que venza la comida</span>
                  </div>
                </div>

                <div className="flex items-start gap-1.5 rounded-xl bg-surface/90 border border-line p-2 shadow-2xs">
                  <Sparkles size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-content-heading font-semibold">Pantalla Completa</strong>
                    <span className="text-content-muted leading-tight">Sin barras del navegador</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: ANDROID (Play Store Experience) */}
          {selectedPlatform === "android" && (
            <div className="space-y-4">
              {/* Native Prompt CTA (if browser supports beforeinstallprompt) */}
              {canInstall && !isStandalone && (
                <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 space-y-2 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>Verificado para Android · Instalación en 1 toque:</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="w-full py-3 px-4 rounded-xl text-sm font-bold shadow-md inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition cursor-pointer"
                  >
                    <Download size={16} />
                    {isInstalling ? "Instalando..." : "Instalar en Android ahora"}
                  </button>
                </div>
              )}

              {/* Step-by-Step Instructions for Mobile */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-content-heading">
                  Cómo instalar desde Chrome, Brave o Samsung Internet:
                </p>

                <div className="space-y-2">
                  <div className="flex items-start gap-3 rounded-xl bg-surface-subtle p-3 border border-line">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                      1
                    </span>
                    <div className="text-xs text-content-body">
                      <p className="font-bold text-content-heading">Abrí el menú del navegador</p>
                      <p className="text-content-muted mt-0.5">
                        Tocá los tres puntos verticales <strong className="text-content">⋮</strong> en la esquina superior derecha.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-surface-subtle p-3 border border-line">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                      2
                    </span>
                    <div className="text-xs text-content-body">
                      <p className="font-bold text-content-heading">Elegí "Instalar aplicación"</p>
                      <p className="text-content-muted mt-0.5">
                        En algunos celulares puede figurar como <strong className="text-content">"Agregar a la pantalla principal"</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-surface-subtle p-3 border border-line">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                      3
                    </span>
                    <div className="text-xs text-content-body">
                      <p className="font-bold text-content-heading">Confirmá la descarga</p>
                      <p className="text-content-muted mt-0.5">
                        Tocá <strong className="text-content">Instalar</strong>. El ícono de FreshTrack aparecerá en tu menú de apps como cualquier aplicación nativa.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: iOS (App Store Experience) */}
          {selectedPlatform === "ios" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-line bg-surface-subtle p-3.5 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.64 1.35-.57.65-1.07 1.72-.94 2.75 1.01.08 2.03-.5 2.66-1.25z" />
                  </svg>
                </span>
                <div className="text-xs">
                  <p className="font-bold text-content-heading">Optimizado para iPhone y iPad</p>
                  <p className="text-content-muted text-[11px]">
                    Apple permite instalar la PWA directamente desde Safari en 3 toques.
                  </p>
                </div>
              </div>

              {/* Step-by-Step Instructions for iOS */}
              <div className="space-y-2">
                <div className="flex items-start gap-3 rounded-xl bg-surface-subtle p-3 border border-line">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold">
                    1
                  </span>
                  <div className="text-xs text-content-body">
                    <p className="font-bold text-content-heading flex items-center gap-1.5">
                      Abrí en Safari y tocá Compartir
                      <span className="inline-flex items-center justify-center rounded bg-surface p-1 border border-line text-blue-500">
                        <Share2 size={13} />
                      </span>
                    </p>
                    <p className="text-content-muted mt-0.5">
                      El botón de Compartir está en la barra inferior (en iPhone) o en la barra superior (en iPad).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-surface-subtle p-3 border border-line">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold">
                    2
                  </span>
                  <div className="text-xs text-content-body">
                    <p className="font-bold text-content-heading">
                      Seleccioná "Agregar a pantalla de inicio"
                    </p>
                    <p className="text-content-muted mt-0.5">
                      Deslizá hacia abajo en el menú de opciones hasta encontrar el ícono cuadrado con un signo más <strong>[+]</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-surface-subtle p-3 border border-line">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold">
                    3
                  </span>
                  <div className="text-xs text-content-body">
                    <p className="font-bold text-content-heading">Tocá "Agregar"</p>
                    <p className="text-content-muted mt-0.5">
                      Ubicado en la esquina superior derecha. Se agregará el ícono a tu pantalla de inicio y se abrirá a pantalla completa sin barras de navegación.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WINDOWS (PC Experience) */}
          {selectedPlatform === "windows" && (
            <div className="space-y-4">
              {canInstall && !isStandalone && (
                <div className="rounded-2xl border-2 border-sky-500/40 bg-sky-50/50 dark:bg-sky-950/30 p-4 space-y-2 text-center">
                  <p className="text-xs font-bold text-sky-900 dark:text-sky-200">
                    Instalar aplicación nativa de escritorio en tu PC:
                  </p>
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="w-full py-3 px-4 rounded-xl text-sm font-bold shadow-md inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 transition"
                  >
                    <Download size={16} />
                    {isInstalling ? "Instalando..." : "Instalar en Windows"}
                  </button>
                </div>
              )}

              <div className="space-y-2.5">
                <p className="text-xs font-bold text-content-heading">
                  Instalación en Google Chrome o Microsoft Edge:
                </p>

                <div className="space-y-2">
                  <div className="flex items-start gap-3 rounded-xl bg-surface-subtle p-3 border border-line">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white text-xs font-bold">
                      1
                    </span>
                    <div className="text-xs text-content-body">
                      <p className="font-bold text-content-heading">Mirá la barra de direcciones</p>
                      <p className="text-content-muted mt-0.5">
                        Hacé clic en el ícono de instalación <strong className="text-content">[⊕]</strong> o computadora que aparece en el extremo derecho de la URL.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-surface-subtle p-3 border border-line">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white text-xs font-bold">
                      2
                    </span>
                    <div className="text-xs text-content-body">
                      <p className="font-bold text-content-heading">O desde el menú del navegador</p>
                      <p className="text-content-muted mt-0.5">
                        Andá al menú <strong className="text-content">⋮</strong> &gt; <strong className="text-content">Transmitir, guardar y compartir</strong> &gt; <strong className="text-content">"Instalar FreshTrack..."</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-surface-subtle p-3 border border-line">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white text-xs font-bold">
                      3
                    </span>
                    <div className="text-xs text-content-body">
                      <p className="font-bold text-content-heading">Ventana independiente y acceso directo</p>
                      <p className="text-content-muted mt-0.5">
                        Se abrirá en su propia ventana, anclable a la barra de tareas y al Menú Inicio de Windows.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LINUX (Desktop Experience) */}
          {selectedPlatform === "linux" && (
            <div className="space-y-4">
              {canInstall && !isStandalone && (
                <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/30 p-4 space-y-2 text-center">
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Instalar aplicación de escritorio en tu distribución Linux:
                  </p>
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="w-full py-3 px-4 rounded-xl text-sm font-bold shadow-md inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition"
                  >
                    <Download size={16} />
                    {isInstalling ? "Instalando..." : "Instalar en Linux (PWA)"}
                  </button>
                </div>
              )}

              <div className="space-y-2.5">
                <p className="text-xs font-bold text-content-heading">
                  En Chrome, Chromium, Brave o Edge para Linux:
                </p>

                <div className="space-y-2">
                  <div className="flex items-start gap-3 rounded-xl bg-surface-subtle p-3 border border-line">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white text-xs font-bold">
                      1
                    </span>
                    <div className="text-xs text-content-body">
                      <p className="font-bold text-content-heading">Menú del navegador</p>
                      <p className="text-content-muted mt-0.5">
                        Hacé clic en el menú <strong className="text-content">⋮</strong> &gt; <strong className="text-content">"Instalar FreshTrack..."</strong> o en el botón de la barra de direcciones.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-surface-subtle p-3 border border-line">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white text-xs font-bold">
                      2
                    </span>
                    <div className="text-xs text-content-body">
                      <p className="font-bold text-content-heading">Integración de sistema</p>
                      <p className="text-content-muted mt-0.5">
                        Crea automáticamente el lanzador <code className="text-xs bg-surface-muted px-1 rounded">.desktop</code> en GNOME, KDE Plasma, XFCE o lanzadores como Rofi/Wofi.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Companion Helper (Quick Link Copy) */}
          <div className="rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                <Smartphone size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-content-heading truncate">
                  ¿Querés instalarla en tu celular?
                </p>
                <p className="text-[11px] text-content-muted truncate">
                  Copiá el enlace y abrilo en Chrome o Safari.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-content hover:bg-surface-muted transition shadow-2xs cursor-pointer"
            >
              {copiedLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copiedLink ? "¡Copiado!" : "Copiar link"}</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-line bg-surface-subtle flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-content-muted">
            <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
            <span>Sin descargas pesadas · Sin permisos invasivos</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-content hover:bg-surface-muted transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InstallAppModal;
