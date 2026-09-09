import { type LucideIcon } from "lucide-react";

export const InfoPill = ({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  tone: string;
}) => (
  <div className="flex items-center gap-3">
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
      <Icon className="h-5 w-5" />
    </span>
    <div>
      <p className="text-lg font-black leading-none text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  </div>
);
