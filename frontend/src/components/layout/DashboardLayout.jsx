import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useTranslation } from "react-i18next";

export default function DashboardLayout({ children }) {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language || "ar");

  const toggleLang = () => {
    const newLang = lang === "ar" ? "en" : "ar";
    i18n.changeLanguage(newLang);
    document.dir = newLang === "ar" ? "rtl" : "ltr";
    setLang(newLang);
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Navbar onToggleLang={toggleLang} />
        <main className="flex-1 bg-background text-foreground p-6">{children}</main>
      </div>
    </div>
  );
}
