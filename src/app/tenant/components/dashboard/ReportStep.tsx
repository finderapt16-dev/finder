import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

export function ReportStep({
icon: Icon,
step,
title,
description,
note,
tone,
children,
}: {
  icon: LucideIcon;
  step: string;
  title: string;
  description: string;
note?: string;
  tone: string;
  children: ReactNode;
}) {
return (
  <section className="report-step grid gap-5 border-b border-[#e8ded1] p-5 last:border-b-0 lg:grid-cols-[320px_1fr] lg:p-6">
    <div className="flex gap-5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8b735b] text-xs font-black text-white">{step}</span>
          <h3 className="text-base font-black text-[#302820]">{title}</h3>
          {note && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500">{note}</span>}
        </div>
        <p className="text-sm font-medium leading-6 text-[#756a60]">{description}</p>
      </div>
    </div>
    <div className="min-w-0">{children}</div>
  </section>
);
}
