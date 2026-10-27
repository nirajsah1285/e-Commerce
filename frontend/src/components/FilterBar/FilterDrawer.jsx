import React from "react";
import { X, SlidersHorizontal, Check } from "lucide-react";

export const FilterDrawer = ({
  isOpen,
  onClose,
  filters,
  setFilters,
  onReset
}) => {
  if (!isOpen) return null;

  const categories = ["clothing", "footwear"];
  const genders = ["ALL", "MEN", "WOMEN", "KIDS"];
  const sortOptions = [
    { label: "Recommended", value: "recommended" },
    { label: "Price: Low to High", value: "price_asc" },
    { label: "Price: High to Low", value: "price_desc" },
    { label: "Customer Rating", value: "rating" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-2xs">
      <div className="w-full max-w-sm bg-white h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
            <SlidersHorizontal size={17} />
            Filters & Sorting
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Sort By */}
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2">
              Sort By
            </h4>
            <div className="space-y-1.5">
              {sortOptions.map((opt) => (
                <label
                  key={opt.value}
                  onClick={() => setFilters({ ...filters, sort: opt.value })}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 transition"
                >
                  <span className={filters.sort === opt.value ? "font-bold text-rose-600" : "text-slate-700"}>
                    {opt.label}
                  </span>
                  {filters.sort === opt.value && <Check size={14} className="text-rose-600" />}
                </label>
              ))}
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2">
              Department
            </h4>
            <div className="flex gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() =>
                    setFilters({
                      ...filters,
                      category: filters.category === c ? "all" : c
                    })
                  }
                  className={`px-3 py-1.5 rounded-full capitalize font-semibold border transition ${
                    filters.category === c
                      ? "bg-rose-600 text-white border-rose-600"
                      : "border-slate-200 text-slate-700 bg-white"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Gender Filter */}
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2">
              Gender
            </h4>
            <div className="flex flex-wrap gap-2">
              {genders.map((g) => (
                <button
                  key={g}
                  onClick={() => setFilters({ ...filters, gender: g })}
                  className={`px-3 py-1 rounded-full font-semibold border transition ${
                    filters.gender === g
                      ? "bg-rose-600 text-white border-rose-600"
                      : "border-slate-200 text-slate-700 bg-white"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-100 flex gap-2">
          <button
            onClick={onReset}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-600 active:scale-95 transition"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 font-bold text-xs text-white shadow-md shadow-rose-200 active:scale-95 transition"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};