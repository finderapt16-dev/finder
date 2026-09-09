import { ChevronRight, type LucideIcon } from "lucide-react";

export const FeatureCard = ({
  title,
  description,
  count,
  icon: Icon,
  section,
  accent,
  setActiveSection,
}: {
  title: string;
  description: string;
  count: number;
  icon: LucideIcon;
  section: string;
  accent: "orange" | "indigo" | "green";
  setActiveSection: (section: string) => void;
}) => {
  const accentClass = {
    orange: "bg-[#FAF8F5] text-[#756A60] border-[#F3EFEA]",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
  }[accent];

  return (
    <button
      onClick={() => setActiveSection(section)}
      className={`relative min-h-80 overflow-hidden rounded-lg border bg-white p-7 text-left shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(15,23,42,0.12)] ${accentClass}`}
    >
      <div className="relative z-10">
        <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg border bg-white/80 shadow-sm">
          <Icon className="h-7 w-7" />
        </span>
        <h3 className="text-2xl font-black text-slate-950">{title}</h3>
        <p className="mt-4 max-w-72 text-sm font-medium leading-6 text-slate-600">{description}</p>
        <div className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider">
          {count.toLocaleString()} {count === 1 ? "listing" : "listings"}
        </div>
        <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-current/25 bg-white px-4 py-2 text-sm font-black">
          Explore Now
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
      <div className="absolute -bottom-10 -right-8 h-36 w-36 rounded-full bg-current/10" />
      <div className="absolute bottom-0 right-0 h-24 w-40 bg-gradient-to-tl from-current/20 to-transparent" />
    </button>
  );
};
