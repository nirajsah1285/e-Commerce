import React from "react";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "../ProductCard/ProductCard";

export const ProductRowSection = ({ title, products, onSeeAll, onSelectProduct }) => {
  return (
    <section className="pt-5">
      <div className="px-3 flex items-center justify-between mb-2">
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
          {title}
        </h3>
        <button
          onClick={onSeeAll}
          className="text-xs font-bold text-rose-600 flex items-center hover:underline"
        >
          See All <ChevronRight size={13} />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar px-3 pb-2">
        {products.map((item) => (
          <div key={item.id} className="w-40 sm:w-44 shrink-0">
            <ProductCard product={item} onSelect={onSelectProduct} />
          </div>
        ))}
      </div>
    </section>
  );
};