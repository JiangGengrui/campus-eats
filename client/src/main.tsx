import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { loadWebFonts } from "./lib/webfonts.js";
import { router } from "./router.js";
import "./styles/site.css";

loadWebFonts();

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
