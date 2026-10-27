import React from "react";
import { CreditCard, ArrowRight } from "lucide-react";

export const BankOfferBanner = () => {
  return (
    <section className="px-3 pt-3">
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-xl p-2.5 flex items-center justify-between shadow-xs border border-slate-800">
        <div className="flex items-center gap-2.5">
          <CreditCard size={18} className="text-amber-400 shrink-0" />
          <div className="leading-tight">
            <p className="text-[11px] font-bold text-amber-300">
              10% EXTRA SAVINGS
            </p>
            <p className="text-[10px] text-slate-300">
              On select credit/debit cards & UPI transactions
            </p>
          </div>
        </div>
        <ArrowRight size={14} className="text-slate-400 shrink-0" />
      </div>
    </section>
  );
};