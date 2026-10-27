import React from "react";
import { MapPin, ChevronDown, Coins } from "lucide-react";

export const DeliveryBar = () => {
  return (
    <div className="bg-slate-900 text-white px-3.5 py-1.5 flex items-center justify-between text-xs tracking-tight select-none">
      <div className="flex items-center gap-1.5 overflow-hidden">
        <MapPin size={13} className="text-rose-500 shrink-0" />
        <span className="text-slate-400 font-normal">Deliver to</span>
        <span className="font-semibold text-slate-100 truncate max-w-[140px] sm:max-w-[200px]">
          Mumbai 400001
        </span>
        <ChevronDown size={12} className="text-slate-400 shrink-0 cursor-pointer hover:text-white transition" />
      </div>

      <div className="flex items-center gap-1 bg-amber-400/15 text-amber-300 px-2 py-0.5 rounded-full font-semibold text-[11px] shrink-0 border border-amber-400/30">
        <Coins size={12} className="text-amber-400" />
        <span>₹150 Cash</span>
      </div>
    </div>
  );
};