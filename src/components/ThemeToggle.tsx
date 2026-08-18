"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("mm_theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add(saved);
    } else {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("mm_theme", next);
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(next);
  };

  if (!mounted) return <div className="w-8 h-8" />;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="p-1.5 sm:p-2 rounded-lg border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-amber-400 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-900 transition-all flex items-center justify-center cursor-pointer shadow-sm"
      aria-label="Toggle Color Theme"
    >
      {theme === "dark" ? (
        <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-in spin-in-90 duration-300" />
      ) : (
        <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700 animate-in spin-in-90 duration-300" />
      )}
    </button>
  );
}
