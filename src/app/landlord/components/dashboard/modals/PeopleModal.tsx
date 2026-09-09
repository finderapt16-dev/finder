import { X } from "lucide-react";

export function PeopleModal({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconColor,
  names,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconColor: string;
  names: string[];
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#F3EFEA] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${iconColor}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-black text-slate-900 text-sm">{title}</p>
              <p className="text-slate-400 text-xs font-medium">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-[#FAF8F5]/60">
          {names.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm font-medium">No one yet</div>
          ) : (
            names.map((name, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAF8F5]/40 transition-colors">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#F3EFEA] to-[#F3EFEA] flex items-center justify-center shrink-0 font-black text-[#5F5145] text-xs">
                  {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <span className="text-slate-800 font-semibold text-sm">{name}</span>
              </div>
            ))
          )}
        </div>
        <div className="px-5 py-3 border-t border-[#FAF8F5] bg-[#FAF8F5]/30">
          <p className="text-xs text-slate-400 font-medium text-center">
            {names.length} {names.length === 1 ? "person" : "people"} total
          </p>
        </div>
      </div>
    </div>
  );
}
