import React from "react";
import { LayoutGrid } from "lucide-react";

export const GenderTabs = ({ activeGender, onSelectGender, onOpenFilters }) => {
  const tabs = ["ALL", "MEN", "WOMEN", "KIDS"];

  return (
    <div className="bg-white border-b border-slate-100 px-3 flex items-center justify-between shadow-2xs">
      <div className="flex space-x-6">
        {tabs.map((tab) => {
          const isActive = activeGender === tab;
          return (
            <button
              key={tab}
              onClick={() => onSelectGender(tab)}
              className={`relative py-2.5 text-xs font-bold tracking-wider transition ${
                isActive ? "text-rose-600" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-rose-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onOpenFilters}
        className="text-slate-500 hover:text-slate-900 p-1 transition"
        title="Browse by filter"
      >
        <LayoutGrid size={17} />
      </button>
    </div>
  );
};