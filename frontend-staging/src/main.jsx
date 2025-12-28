import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// الحصول على العنصر الجذر من index.html
const rootElement = document.getElementById("root");

// إنشاء الجذر باستخدام API الجديدة
const root = createRoot(rootElement);

// تشغيل التطبيق
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
