"use client";

import { useEffect, useState } from "react";

/** A mastery/progress bar that animates from 0 to `value` (0..1) on mount. */
export default function AnimatedBar({
  value,
  className = "",
  barClassName = "bg-clinical-500",
  height = "h-1.5",
}: {
  value: number;
  className?: string;
  barClassName?: string;
  height?: string;
}) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <div
      className={`${height} w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 ${className}`}
    >
      <div
        className={`h-full rounded-full ${barClassName}`}
        style={{
          width: `${Math.round(w * 100)}%`,
          transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
        }}
      />
    </div>
  );
}
