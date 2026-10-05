import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Leaf, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface-subtle p-4">
      <Card className="w-full max-w-md shadow-xl border border-line bg-surface/90 backdrop-blur-md">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-subtle text-brand-text shadow-sm">
              <Leaf size={32} />
            </div>
          </div>

          <h1 className="text-4xl font-display font-extrabold text-content-heading mb-1">404</h1>

          <h2 className="text-lg font-semibold text-content mb-3">
            Página no encontrada
          </h2>

          <p className="text-xs text-content-muted mb-6 leading-relaxed max-w-xs mx-auto">
            La sección que buscás no existe o fue movida. Volvé a tu despensa para seguir controlando tus alimentos.
          </p>

          <div className="flex justify-center">
            <Button
              onClick={handleGoHome}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-full shadow-sm shadow-emerald-600/25 text-xs font-semibold"
            >
              <Home className="w-4 h-4 mr-1.5" />
              Volver al inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
