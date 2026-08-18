import React from "react";
import { Info, AlertTriangle, CheckCircle, Flame } from "lucide-react";

interface CalloutProps {
  type?: "info" | "warning" | "success" | "danger";
  title?: string;
  children: React.ReactNode;
}

export default function Callout({ type = "info", title, children }: CalloutProps) {
  const styles = {
    info: {
      borderLeft: "border-l-orange-500",
      icon: <Info className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />,
      titleColor: "text-orange-400",
    },
    warning: {
      borderLeft: "border-l-amber-500",
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
      titleColor: "text-amber-400",
    },
    success: {
      borderLeft: "border-l-emerald-500",
      icon: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
      titleColor: "text-emerald-400",
    },
    danger: {
      borderLeft: "border-l-red-500",
      icon: <Flame className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />,
      titleColor: "text-red-400",
    },
  };

  const s = styles[type];

  return (
    <div className={`my-8 p-5 rounded-lg border-l-4 ${s.borderLeft} border border-[#27272a] bg-[#121215] flex gap-3 text-sm leading-relaxed`}>
      {s.icon}
      <div className="space-y-1">
        {title && <h5 className={`font-semibold ${s.titleColor} text-base`}>{title}</h5>}
        <div className="text-zinc-300">{children}</div>
      </div>
    </div>
  );
}
