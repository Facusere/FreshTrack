import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker, setupPWAInstallListeners } from "./lib/pwaAndNotifications";

setupPWAInstallListeners();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);

