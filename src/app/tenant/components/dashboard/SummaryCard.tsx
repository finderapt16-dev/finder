import { ChevronRight, type LucideIcon } from "lucide-react";

export const SummaryCard = ({
  title,
  value,
  detail,
  icon: Icon,
  tone,
  onClick,
}: {
  title: string;
  value: number;
  detail: string;
  icon: LucideIcon;
  tone: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="group flex min-h-36 items-center gap-5 rounded-lg border border-slate-200 bg-white p-6 text-left shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(15,23,42,0.12)]"
  >
    <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg shadow-lg ${tone}`}>
      <Icon className="h-8 w-8" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold text-slate-600">{title}</span>
      <strong className="mt-1 block text-4xl font-black leading-none text-[#756A60]">{value.toLocaleString()}</strong>
      <span className="mt-2 block text-sm font-medium text-slate-500">{detail}</span>
    </span>
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-[#8B735B] transition group-hover:bg-[#8B735B] group-hover:text-white">
      <ChevronRight className="h-5 w-5" />
    </span>
  </button>
);
