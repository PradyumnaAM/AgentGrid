import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const ScrollRestoration = () => {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      return;
    }

    window.requestAnimationFrame(() => {
      const target = document.getElementById(hash.slice(1));
      if (typeof target?.scrollIntoView === "function") {
        target.scrollIntoView({ block: "start" });
      }
    });
  }, [hash, pathname]);

  return null;
};

const legacyNoAccountRoutes = [
  "/login",
  "/register",
  "/account",
  "/account/*",
  "/dashboard",
  "/dashboard/*",
  "/workspace",
  "/workspace/*",
];

const App = () => (
  <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
    <ScrollRestoration />
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/download" element={<Navigate to="/#download" replace />} />
      {legacyNoAccountRoutes.map((path) => (
        <Route key={path} path={path} element={<Navigate to="/#download" replace />} />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
