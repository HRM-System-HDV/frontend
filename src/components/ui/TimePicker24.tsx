"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock } from "@fortawesome/free-solid-svg-icons";

interface TimePicker24Props {
  value: string; // "HH:mm" (24h format: "00:00" -> "23:59")
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}

export default function TimePicker24({
  value,
  onChange,
  className = "",
  placeholder = "HH:mm",
}: TimePicker24Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const parseTime = (str: string) => {
    if (!str || !str.includes(":")) return { h: "00", m: "00" };
    const [h, m] = str.split(":");
    const validH = String(Math.min(23, Math.max(0, parseInt(h, 10) || 0))).padStart(2, "0");
    const validM = String(Math.min(59, Math.max(0, parseInt(m, 10) || 0))).padStart(2, "0");
    return { h: validH, m: validM };
  };

  const { h: currentHour, m: currentMinute } = parseTime(value);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  const handleSelectHour = (newHour: string) => {
    onChange(`${newHour}:${currentMinute}`);
  };

  const handleSelectMinute = (newMinute: string) => {
    onChange(`${currentHour}:${newMinute}`);
  };

  // Direct text input typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9:]/g, "");
    if (raw.length === 2 && !raw.includes(":") && value.length < raw.length) {
      raw = `${raw}:`;
    }
    if (raw.length > 5) raw = raw.slice(0, 5);
    onChange(raw);
  };

  const handleBlur = () => {
    if (!value) return;
    const parts = value.split(":");
    let h = parseInt(parts[0] || "0", 10);
    let m = parseInt(parts[1] || "0", 10);
    if (isNaN(h) || h < 0) h = 0;
    if (h > 23) h = 23;
    if (isNaN(m) || m < 0) m = 0;
    if (m > 59) m = 59;
    onChange(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  const hoursList = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutesList = [
    "00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55", "59"
  ];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          maxLength={5}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={() => setOpen(true)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm font-mono text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-100 transition"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((prev) => !prev)}
          className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FontAwesomeIcon icon={faClock} fontSize={14} />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-56 bg-white border border-gray-200 rounded-xl shadow-xl p-3 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 text-xs font-semibold text-gray-500">
            <span className="w-1/2 text-center">Giờ (00 - 23)</span>
            <span className="w-1/2 text-center">Phút (00 - 59)</span>
          </div>
          <div className="flex gap-2 h-48">
            {/* Hour column */}
            <div className="w-1/2 overflow-y-auto pr-1 space-y-1 scrollbar-thin">
              {hoursList.map((h) => {
                const isSelected = h === currentHour;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleSelectHour(h)}
                    className={`w-full py-1 text-center text-xs font-mono rounded-md transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-white font-bold shadow-2xs"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {h}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="w-[1px] bg-gray-100" />

            {/* Minute column */}
            <div className="w-1/2 overflow-y-auto pl-1 space-y-1 scrollbar-thin">
              {minutesList.map((m) => {
                const isSelected = m === currentMinute;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleSelectMinute(m)}
                    className={`w-full py-1 text-center text-xs font-mono rounded-md transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-white font-bold shadow-2xs"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center text-xs">
            <span className="text-gray-500 font-mono">Đang chọn: <strong className="text-gray-800">{currentHour}:{currentMinute}</strong></span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-primary font-semibold hover:underline cursor-pointer"
            >
              Xong
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

