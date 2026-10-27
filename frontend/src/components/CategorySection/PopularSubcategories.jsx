import React from "react";
import { SUB_CATEGORIES } from "../../data/categories";

export const PopularSubcategories = ({ activeCategory = "all", onSelectSubCategory }) => {
  const items =
    activeCategory !== "all" && SUB_CATEGORIES[activeCategory]
      ? SUB_CATEGORIES[activeCategory]
      : [...SUB_CATEGORIES.clothing, ...SUB_CATEGORIES.footwear];

  return (
    <section className="pt-4">
      <div className="px-3 flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Popular In {activeCategory === "all" ? "MANPASAND" : activeCategory}
        </h2>
      </div>

      <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar px-3 pb-1">
        {items.map((sub, idx) => (
          <div
            key={idx}
            onClick={() => onSelectSubCategory(sub.name)}
            className="flex flex-col items-center flex-shrink-0 cursor-pointer group active:scale-95 transition"
          >
            <div className="w-14 h-14 rounded-full p-0.5 border-2 border-rose-100 group-hover:border-rose-600 transition shadow-xs overflow-hidden bg-white">
              <img
                src={sub.image}
                alt={sub.name}
                className="w-full h-full rounded-full object-cover group-hover:scale-110 transition duration-300"
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 mt-1 group-hover:text-rose-600 tracking-tight text-center truncate max-w-[64px]">
              {sub.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};