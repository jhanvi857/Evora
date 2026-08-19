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
      borderLeft: "border-l-brandAccent",
      icon: <Info className="w-4 h-4 text-brandActiveCursor shrink-0 mt-0.5" />,
      titleColor: "text-brandActiveCursor",
      bg: "bg-[#141010]",
    },
    warning: {
      borderLeft: "border-l-stateWarning",
      icon: <AlertTriangle className="w-4 h-4 text-stateWarning shrink-0 mt-0.5" />,
      titleColor: "text-stateWarning",
      bg: "bg-[#17130e]",
    },
    success: {
      borderLeft: "border-l-stateSuccess",
      icon: <CheckCircle className="w-4 h-4 text-stateSuccess shrink-0 mt-0.5" />,
      titleColor: "text-stateSuccess",
      bg: "bg-[#0e1611]",
    },
    danger: {
      borderLeft: "border-l-stateDanger",
      icon: <Flame className="w-4 h-4 text-stateDanger shrink-0 mt-0.5" />,
      titleColor: "text-stateDanger",
      bg: "bg-[#170e0e]",
    },
  };

  const s = styles[type];

  return (
    <div className={`my-7 p-4 rounded border-l-3 ${s.borderLeft} border border-borderColor ${s.bg} flex gap-3 text-xs sm:text-sm leading-relaxed`}>
      {s.icon}
      <div className="space-y-1">
        {title && <h5 className={`font-mono font-semibold ${s.titleColor} text-xs uppercase tracking-wide`}>{title}</h5>}
        <div className="text-textMuted leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
