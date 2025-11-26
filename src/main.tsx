
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";

  // Disable console logs in production
  if (import.meta.env.PROD) {
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    // Keep console.error and console.warn for debugging critical issues
  }

  createRoot(document.getElementById("root")!).render(<App />);
  