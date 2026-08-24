"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "daily_report_selected_company";

export function useSelectedCompany() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) || "";
    }
    return "";
  });

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) setSelectedCompanyId(stored);

    const handleCompanyChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setSelectedCompanyId(customEvent.detail);
      }
    };

    window.addEventListener("company-changed", handleCompanyChange);
    return () => window.removeEventListener("company-changed", handleCompanyChange);
  }, []);

  return selectedCompanyId;
}
