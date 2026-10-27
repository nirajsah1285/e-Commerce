import React from "react";
import { MAIN_CATEGORIES } from "../../data/categories";

export const MainCategoryCards = ({ onSelectCategory }) => {
  return (
    <section className="px-3 pt-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Explore Core Categories
        </h2>
        <span className="text-[11px] font-semibold text-rose-600">2 Departments</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {MAIN_CATEGORIES.map((cat) => (
          <div
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-xs border border-slate-100 hover:shadow-md transition active:scale-[0.98]"
          >
            <div className="h-32 w-full overflow-hidden">
              <img
                src={cat.image}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
            </div>
            <div className="p-3 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-transparent absolute inset-0 flex flex-col justify-end text-white">
              <p className="text-[10px] uppercase font-bold text-rose-300 tracking-wider">
                {cat.itemCount}
              </p>
              <h3 className="font-extrabold text-sm leading-tight">{cat.name}</h3>
              <p className="text-[10px] text-slate-200 line-clamp-1">{cat.tagline}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};