
import React, { useState } from "react";
import {
  ArrowLeft,
  Star,
  Heart,
  Truck,
  RotateCcw,
  ShieldCheck,
  Check,
} from "lucide-react";

import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";

export const ProductDetails = ({ product, onBack, onNavigate }) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();

  const [selectedSize, setSelectedSize] = useState(
    product.sizes?.[0] || "STD"
  );

  const [selectedColor, setSelectedColor] = useState(
    product.colors?.[0] || "Default"
  );

  const [pincode, setPincode] = useState("");
  const [pincodeStatus, setPincodeStatus] = useState("");
  const [added, setAdded] = useState(false);

  const favorited = isInWishlist(product.id);

  // Add product to cart
  const handleAddToCart = () => {
    addToCart(product, selectedSize, selectedColor);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  // Add product to cart and navigate to checkout
  const handleBuyNow = () => {
    addToCart(product, selectedSize, selectedColor);
    onNavigate("checkout");
  };

  // Basic pincode input validation
  const handleCheckPincode = (e) => {
    e.preventDefault();

    if (/^\d{6}$/.test(pincode.trim())) {
      setPincodeStatus(
        "Pincode entered. Please confirm delivery availability at checkout."
      );
    } else {
      setPincodeStatus("Please enter a valid 6-digit pincode.");
    }
  };

  return (
    <div className="min-h-screen bg-white pb-28 md:pb-12">
      {/* Top Navigation */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-md md:px-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-700 transition hover:text-slate-950"
        >
          <ArrowLeft size={18} />
          <span className="hidden md:inline">Back to shopping</span>
        </button>

        <span className="text-center text-xs font-black uppercase tracking-wider text-slate-400">
          MANPASAND / {product.category} / {product.subCategory}
        </span>

        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          aria-label={
            favorited ? "Remove from wishlist" : "Add to wishlist"
          }
          className="p-1 text-slate-700 transition hover:text-rose-600"
        >
          <Heart
            size={20}
            className={
              favorited ? "fill-rose-600 text-rose-600" : ""
            }
          />
        </button>
      </div>

      {/* Main Product Layout */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 px-4 py-4 md:grid-cols-2 md:px-8 md:py-8">
        {/* Product Image */}
        <div className="space-y-3 md:sticky md:top-20">
          <div className="relative overflow-hidden rounded-2xl bg-slate-100 shadow-sm">
            <img
              src={product.image}
              alt={product.name}
              className="h-auto max-h-[550px] w-full object-cover"
            />

            {/* Rating */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-white/95 px-2.5 py-1 text-xs font-bold shadow-sm">
              <span>{product.rating}</span>

              <Star
                size={12}
                className="fill-amber-400 text-amber-400"
              />

              <span className="font-normal text-slate-400">
                ({product.reviewsCount} Ratings)
              </span>
            </div>
          </div>
        </div>

        {/* Product Information */}
        <div className="space-y-5">
          {/* Name and Price */}
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-rose-600">
              {product.subCategory}
            </span>

            <h1 className="mt-1 text-xl font-black leading-snug text-slate-900 md:text-2xl">
              {product.name}
            </h1>

            <div className="mt-2.5 flex flex-wrap items-baseline gap-3">
              <span className="text-2xl font-black text-slate-900">
                ₹{product.discountPrice}
              </span>

              <span className="text-base text-slate-400 line-through">
                ₹{product.originalPrice}
              </span>

              <span className="text-sm font-extrabold text-rose-600">
                {product.discountBadge}
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-400">
              Inclusive of all taxes
            </p>
          </div>

          <hr className="border-slate-100" />

          {/* Size Selection */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <label className="text-xs font-bold uppercase text-slate-900">
                Select Size
              </label>

              <span className="cursor-pointer text-xs font-semibold text-rose-600 hover:underline">
                Size Guide
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {product.sizes?.map((size) => (
                <button
                  type="button"
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`min-w-[46px] rounded-xl border px-3.5 py-2.5 text-xs font-bold transition active:scale-95 ${
                    selectedSize === size
                      ? "border-rose-600 bg-rose-50 text-rose-600"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          {product.colors?.length > 0 && (
            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-slate-900">
                Select Color:{" "}
                <span className="font-semibold capitalize text-slate-500">
                  {selectedColor}
                </span>
              </label>

              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                      selectedColor === color
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Desktop Action Buttons */}
          <div className="hidden gap-3 pt-2 md:flex">
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-slate-900 py-3.5 text-xs font-black text-slate-900 transition hover:bg-slate-900 hover:text-white active:scale-95"
            >
              {added && <Check size={16} />}
              {added ? "ADDED TO BAG" : "ADD TO BAG"}
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              className="flex-1 rounded-xl bg-rose-600 py-3.5 text-xs font-black text-white shadow-md shadow-rose-200 transition hover:bg-rose-700 active:scale-95"
            >
              BUY NOW
            </button>
          </div>

          {/* Delivery Checker */}
          <div className="pt-2">
            <label className="mb-2 block text-xs font-bold uppercase text-slate-900">
              Check Delivery & Availability
            </label>

            <form
              onSubmit={handleCheckPincode}
              className="flex max-w-sm gap-2"
            >
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pincode}
                onChange={(e) => {
                  setPincode(e.target.value.replace(/\D/g, ""));
                  setPincodeStatus("");
                }}
                placeholder="Enter 6-digit Pincode"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
              />

              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 active:scale-95"
              >
                Check
              </button>
            </form>

            {pincodeStatus && (
              <p className="mt-2 text-xs font-medium text-slate-600">
                {pincodeStatus}
              </p>
            )}
          </div>

          {/* Product Description */}
          <div className="space-y-3 pt-2">
            <div>
              <h3 className="mb-1 text-xs font-bold uppercase text-slate-900">
                About Product
              </h3>

              <p className="text-xs leading-relaxed text-slate-600 md:text-sm">
                {product.description}
              </p>
            </div>

            {/* Specifications */}
            {product.specifications && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <h4 className="mb-3 text-xs font-bold uppercase text-slate-900">
                  Specifications
                </h4>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {Object.entries(product.specifications).map(
                    ([key, value]) => (
                      <div key={key}>
                        <span className="block text-slate-400">
                          {key}
                        </span>

                        <span className="font-semibold text-slate-800">
                          {value}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Service Information */}
          <div className="grid grid-cols-3 gap-3 rounded-xl border border-rose-100 bg-rose-50/50 p-4 text-center">
            <div className="flex flex-col items-center text-xs font-bold text-slate-700">
              <Truck size={18} className="mb-1 text-rose-600" />
              Fast Dispatch
            </div>

            <div className="flex flex-col items-center text-xs font-bold text-slate-700">
              <RotateCcw size={18} className="mb-1 text-rose-600" />
              7 Days Return
            </div>

            <div className="flex flex-col items-center text-xs font-bold text-slate-700">
              <ShieldCheck size={18} className="mb-1 text-rose-600" />
              100% Genuine
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex gap-2 border-t border-slate-200 bg-white p-3 shadow-lg md:hidden">
        <button
          type="button"
          onClick={handleAddToCart}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl border-2 border-slate-900 py-3 text-xs font-black text-slate-900 active:scale-95"
        >
          {added && <Check size={15} />}
          {added ? "ADDED" : "ADD TO BAG"}
        </button>

        <button
          type="button"
          onClick={handleBuyNow}
          className="flex-1 rounded-xl bg-rose-600 py-3 text-xs font-black text-white shadow-md shadow-rose-200 active:scale-95"
        >
          BUY NOW
        </button>
      </div>
    </div>
  );
};
