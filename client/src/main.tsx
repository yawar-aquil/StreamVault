import { createRoot } from "react-dom/client";
import App from "./App";
import "./lib/i18n"; // Initialize i18n
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
