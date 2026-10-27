
import React, { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, ArrowLeft, RefreshCw } from "lucide-react";
import { ProductCard } from "../components/ProductCard/ProductCard";
import { getProducts } from "../services/api";

export const Products = ({
  category = "all",
  searchQuery = "",
  filters = { category: "all", gender: "ALL", sort: "recommended" },
  onOpenFilters,
  onSelectProduct,
  onBack
}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const result = await getProducts();

        if (active) {
          setProducts(Array.isArray(result) ? result : []);
        }
      } catch (err) {
        if (active) {
          setError(
            "Unable to load products. Please check that the Manpasand backend is running."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return products
      .filter((item) => {
        if (category !== "all" && item.category !== category) return false;

        if (
          filters.category !== "all" &&
          item.category !== filters.category
        ) {
          return false;
        }

        if (
          filters.gender !== "ALL" &&
          item.gender !== filters.gender
        ) {
          return false;
        }

        if (query) {
          const matchName = item.name?.toLowerCase().includes(query);
          const matchSub = item.subCategory?.toLowerCase().includes(query);
          const matchDesc = item.description?.toLowerCase().includes(query);

          if (!matchName && !matchSub && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sort === "price_asc") {
          return Number(a.discountPrice) - Number(b.discountPrice);
        }

        if (filters.sort === "price_desc") {
          return Number(b.discountPrice) - Number(a.discountPrice);
        }

        if (filters.sort === "rating") {
          return Number(b.rating) - Number(a.rating);
        }

        return 0;
      });
  }, [products, category, filters, searchQuery]);

  return (
    <div className="pb-24 md:pb-16 min-h-screen bg-slate-50 w-full">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 md:px-10 lg:px-16 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 text-slate-700 hover:text-slate-950 transition active:scale-90"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h2 className="text-base md:text-lg font-black capitalize text-slate-900 leading-tight">
              {category === "all" ? "All Styles" : category}
            </h2>

            <p className="text-xs text-slate-400">
              {loading ? "Loading products..." : `${filteredProducts.length} items available`}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenFilters}
          className="flex items-center gap-2 bg-slate-100 border border-slate-200/80 px-4 py-2 rounded-full text-xs font-bold text-slate-700 hover:bg-slate-200 transition active:scale-95"
        >
          <SlidersHorizontal size={14} />
          <span>Filters &amp; Sort</span>
        </button>
      </div>

      <div className="px-4 md:px-10 lg:px-16 py-6">
        {loading ? (
          <div className="text-center py-20 text-slate-500">
            <RefreshCw className="animate-spin mx-auto mb-3" size={28} />
            <p className="font-semibold">Loading Manpasand products...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 p-8 max-w-lg mx-auto">
            <p className="text-red-600 text-base font-bold">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-slate-900 text-white px-5 py-2 text-sm font-bold"
            >
              Try again
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 p-8 shadow-xs max-w-lg mx-auto">
            <p className="text-slate-700 text-base font-bold">
              No products match your criteria
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Try clearing some filters or searching for something else.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
