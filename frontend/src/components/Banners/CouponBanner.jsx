import React, { useState } from "react";
import { Tag, Copy, Check } from "lucide-react";

export const CouponBanner = () => {
  const [copied, setCopied] = useState(false);
  const code = "MANPASAND25";

  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="px-3 pt-3">
      <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Tag size={16} />
          </div>
          <div>
            <p className="text-xs font-extrabold text-slate-900 leading-tight">
              GET 80% OFF <span className="text-rose-600 font-bold">(Up to ₹300)</span>
            </p>
            <p className="text-[11px] text-slate-500">Applicable on Clothing & Footwear</p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="border border-dashed border-rose-500 bg-white px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-rose-600 flex items-center gap-1 hover:bg-rose-50 transition active:scale-95"
        >
          {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
          {copied ? "COPIED" : code}
        </button>
      </div>
    </section>
  );
};