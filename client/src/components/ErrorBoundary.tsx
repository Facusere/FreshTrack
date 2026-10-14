import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl font-bold text-content-heading mb-2">Ocurrió un error inesperado</h2>
            <p className="text-xs text-content-muted mb-4 text-center">
              Tus datos guardados en el dispositivo están seguros. Podés recargar la página para continuar.
            </p>

            <div className="p-4 w-full rounded-xl bg-surface-muted border border-line overflow-auto mb-6 max-h-48">
              <pre className="text-xs text-content-muted whitespace-break-spaces font-mono">
                {this.state.error?.message || this.state.error?.stack}
              </pre>
            </div>

            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl",
                "bg-brand text-white font-bold text-xs",
                "hover:bg-brand-hover shadow-sm cursor-pointer transition active:scale-[0.98]"
              )}
            >
              <RotateCcw size={15} />
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
