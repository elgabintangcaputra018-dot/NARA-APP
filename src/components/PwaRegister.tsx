"use client";

import { useEffect } from "react";

export const PwaRegister = () => {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("Nara PWA ServiceWorker terdaftar:", reg.scope);
          })
          .catch((err) => {
            console.warn("Nara PWA ServiceWorker registrasi gagal:", err);
          });
      });
    }
  }, []);

  return null;
};

export default PwaRegister;
