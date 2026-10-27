import React from "react";
import { ArrowLeft, Heart } from "lucide-react";
import { useWishlist } from "../context/WishlistContext";
import { ProductCard } from "../components/ProductCard/ProductCard";

export const Wishlist = ({ onBack, onNavigate, onSelectProduct }) => {
  const { wishlist } = useWishlist();

  if (wishlist.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4">
          <Heart size={36} />
        </div>
        <h2 className="text-base font-extrabold text-slate-900 mb-1">Your Wishlist is Empty</h2>
        <p className="text-xs text-slate-500 mb-6">Save your favorite Clothing & Footwear picks here for later.</p>
        <button
          onClick={() => onNavigate("home")}
          className="px-6 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-200 active:scale-95 transition"
        >
          Explore MANPASAND
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24 min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100 px-3 py-3 flex items-center gap-2">
        <button onClick={onBack} className="p-1 text-slate-700 hover:text-slate-950 transition active:scale-90">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-sm font-extrabold text-slate-900">My Wishlist ({wishlist.length})</h1>
      </div>

      <div className="p-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {wishlist.map((item) => (
          <ProductCard key={item.id} product={item} onSelect={onSelectProduct} />
        ))}
      </div>
    </div>
  );
};