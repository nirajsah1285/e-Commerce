import React from "react";
import { Heart, Star } from "lucide-react";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";

export const ProductCard = ({ product, onSelect }) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const favorited = isInWishlist(product.id);

  return (
    <div className="group bg-white rounded-xl overflow-hidden border border-slate-100 shadow-2xs flex flex-col justify-between hover:shadow-md transition">
      <div
        onClick={() => onSelect(product)}
        className="relative aspect-square w-full overflow-hidden bg-slate-50 cursor-pointer"
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          loading="lazy"
        />

        {/* Discount Badge */}
        {product.discountBadge && (
          <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-xs">
            {product.discountBadge}
          </span>
        )}

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 backdrop-blur-xs text-slate-600 hover:text-rose-600 shadow-xs active:scale-90 transition"
        >
          <Heart
            size={14}
            className={favorited ? "fill-rose-600 text-rose-600" : ""}
          />
        </button>

        {/* Rating Chip */}
        <div className="absolute bottom-2 left-2 bg-white/95 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 text-slate-800 shadow-2xs">
          <span>{product.rating}</span>
          <Star size={10} className="fill-amber-400 text-amber-400" />
          <span className="text-slate-400 font-normal">| {product.reviewsCount}</span>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-2.5 flex flex-col flex-1 justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            {product.subCategory}
          </span>
          <h4
            onClick={() => onSelect(product)}
            className="text-xs font-semibold text-slate-900 line-clamp-1 cursor-pointer hover:text-rose-600 transition"
          >
            {product.name}
          </h4>
        </div>

        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-xs font-extrabold text-slate-900">
            ₹{product.discountPrice}
          </span>
          <span className="text-[11px] text-slate-400 line-through">
            ₹{product.originalPrice}
          </span>
        </div>

        <button
          onClick={() => addToCart(product)}
          className="mt-2 w-full py-1.5 text-center text-[11px] font-bold rounded-lg border border-rose-600 text-rose-600 hover:bg-rose-600 hover:text-white transition active:scale-95"
        >
          Add to Bag
        </button>
      </div>
    </div>
  );
};