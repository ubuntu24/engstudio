"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Palette, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const themes = [
  { id: "emerald", name: "Emerald", color: "#10b981" },
  { id: "teal", name: "Teal", color: "#00ADB5" },
  { id: "ice", name: "Ice", color: "#71C9CE" },
  { id: "light", name: "Light", color: "#0f172a" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleThemeChange = (newTheme: string) => {
    // @ts-ignore
    if (!document.startViewTransition) {
      setTheme(newTheme);
      setIsOpen(false);
      return;
    }

    // @ts-ignore
    const transition = document.startViewTransition(() => {
      setTheme(newTheme);
      setIsOpen(false);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        [
          { clipPath: `circle(0px at 100% 0%)` },
          { clipPath: `circle(150% at 100% 0%)` },
        ],
        {
          duration: 700,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full bg-bg-surface border border-border-main text-text-muted hover:text-text-main hover:border-border-hover transition-colors shadow-sm active:scale-95"
        title="Đổi giao diện"
      >
        <Palette className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 p-2 w-40 bg-bg-surface border border-border-main rounded-2xl shadow-2xl z-50 flex flex-col gap-1"
            >
              <div className="px-2 py-1 mb-1 text-xs font-bold text-text-muted uppercase tracking-wider">
                Giao diện
              </div>
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  className={`flex items-center justify-between px-3 py-2 text-sm rounded-xl transition ${
                    theme === t.id
                      ? "bg-bg-surface-hover text-primary-500 font-bold"
                      : "text-text-muted hover:bg-bg-surface-hover hover:text-text-main"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.name}
                  </div>
                  {theme === t.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
