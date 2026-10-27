import React from "react";
import { Search, Mic, Camera, Heart, ShoppingBag, User } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";

export const SearchHeader = ({ onNavigate, onSearch, searchQuery = "" }) => {
  const { totalCount } = useCart();
  const { wishlistCount } = useWishlist();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 md:px-10 lg:px-16 py-3 shadow-xs">
      <div className="w-full flex items-center justify-between gap-4 md:gap-8">
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate("home")}
          className="cursor-pointer select-none shrink-0"
        >
          <span className="text-xl md:text-2xl font-black tracking-wider text-slate-950 uppercase">
            MAN<span className="text-rose-600">PASAND</span>
          </span>
        </div>

        {/* Laptop-Only Full Display Menu Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-700">
          <button
            onClick={() => onNavigate("catalog")}
            className="hover:text-rose-600 transition"
          >
            All Collections
          </button>
          <button
            onClick={() => {
              onSearch("");
              onNavigate("catalog");
            }}
            className="hover:text-rose-600 transition"
          >
            Clothing
          </button>
          <button
            onClick={() => {
              onSearch("");
              onNavigate("catalog");
            }}
            className="hover:text-rose-600 transition"
          >
            Footwear
          </button>
          <span className="text-rose-500 bg-rose-50 px-2.5 py-0.5 rounded-full text-xs font-black">
            Sale Up to 50%
          </span>
        </nav>

        {/* Search Bar */}
        <div className="flex-1 max-w-sm md:max-w-xl relative flex items-center bg-slate-100 rounded-full px-4 py-2 border border-slate-200/80">
          <Search size={16} className="text-slate-400 mr-2.5 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search Shirts, Jeans, Sneakers..."
            className="w-full bg-transparent text-xs md:text-sm text-slate-800 focus:outline-none placeholder:text-slate-400"
          />
          <div className="flex items-center gap-2.5 text-slate-400 pl-1 shrink-0">
            <Mic size={16} className="cursor-pointer hover:text-slate-700 transition" />
            <Camera size={16} className="cursor-pointer hover:text-slate-700 transition" />
          </div>
        </div>

        {/* Icons Action Area */}
        <div className="flex items-center gap-4 md:gap-7 text-slate-700 shrink-0">
          <button
            onClick={() => onNavigate("wishlist")}
            aria-label="Wishlist"
            className="relative p-1 hover:text-rose-600 transition flex items-center gap-2"
          >
            <Heart size={22} />
            <span className="hidden md:inline text-xs font-bold">Wishlist</span>
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 md:top-0 md:right-auto md:-left-2 bg-rose-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {wishlistCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigate("cart")}
            aria-label="Shopping Bag"
            className="relative p-1 hover:text-rose-600 transition flex items-center gap-2"
          >
            <ShoppingBag size={22} />
            <span className="hidden md:inline text-xs font-bold">Bag</span>
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 md:top-0 md:right-auto md:-left-2 bg-rose-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {totalCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigate("account")}
            aria-label="Account"
            className="p-1 hover:text-rose-600 transition flex items-center gap-2"
          >
            <User size={22} />
            <span className="hidden md:inline text-xs font-bold">Account</span>
          </button>
        </div>
      </div>
    </header>
  );
};