import React, { useState } from "react";
import { Trash2, Plus, Minus, ArrowLeft, Tag, ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";

export const Cart = ({ onNavigate, onBack }) => {
  const {
    cart,
    updateQuantity,
    removeFromCart,
    subtotal,
    totalOriginal,
    couponDiscount,
    shippingFee,
    finalTotal,
    appliedCoupon,
    setAppliedCoupon
  } = useCart();

  const [couponInput, setCouponInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (couponInput.trim().toUpperCase() === "MANPASAND25") {
      setAppliedCoupon("MANPASAND25");
      setErrorMsg("");
    } else {
      setErrorMsg("Invalid voucher. Use MANPASAND25 for 25% off");
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4">
          <ShoppingBag size={36} />
        </div>
        <h2 className="text-base font-extrabold text-slate-900 mb-1">Your MANPASAND Bag is Empty</h2>
        <p className="text-xs text-slate-500 mb-6">Discover trending clothes & shoes made for your lifestyle.</p>
        <button
          onClick={() => onNavigate("home")}
          className="px-6 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-200 active:scale-95 transition"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="pb-28 bg-slate-50 min-h-screen">
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100 px-3 py-3 flex items-center gap-2">
        <button onClick={onBack} className="p-1 text-slate-700 hover:text-slate-950 transition active:scale-90">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-sm font-extrabold text-slate-900">MANPASAND Bag ({cart.length})</h1>
      </div>

      <div className="p-3 space-y-3">
        {/* Item List */}
        {cart.map((item) => (
          <div
            key={item.cartItemId}
            className="bg-white rounded-xl p-3 border border-slate-100 flex gap-3 shadow-xs"
          >
            <img
              src={item.image}
              alt={item.name}
              className="w-20 h-24 rounded-lg object-cover bg-slate-100 shrink-0"
            />
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{item.name}</h3>
                  <button
                    onClick={() => removeFromCart(item.cartItemId)}
                    className="text-slate-400 hover:text-rose-600 p-0.5 transition"
                    aria-label="Remove item"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Size: <span className="font-semibold text-slate-700">{item.selectedSize}</span> | Color:{" "}
                  <span className="font-semibold text-slate-700">{item.selectedColor}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-black text-slate-900">₹{item.discountPrice}</span>
                  <span className="text-[10px] text-slate-400 line-through">₹{item.originalPrice}</span>
                </div>

                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <button
                    onClick={() => updateQuantity(item.cartItemId, -1)}
                    className="p-1 text-slate-600 hover:bg-slate-200 transition"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="px-2 text-xs font-bold text-slate-800">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.cartItemId, 1)}
                    className="p-1 text-slate-600 hover:bg-slate-200 transition"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Voucher Form */}
        <div className="space-y-1.5">
          <form onSubmit={handleApplyCoupon} className="bg-white rounded-xl p-3 border border-slate-100 flex gap-2">
            <div className="relative flex-1">
              <Tag size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Coupon code (MANPASAND25)"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-xs font-mono uppercase focus:outline-none focus:border-rose-500"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition active:scale-95"
            >
              Apply
            </button>
          </form>

          {errorMsg && (
            <p className="text-[11px] text-rose-500 font-semibold px-1">{errorMsg}</p>
          )}

          {appliedCoupon && (
            <div className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center justify-between">
              <span>✓ Coupon '{appliedCoupon}' applied (-25%)</span>
              <button
                onClick={() => setAppliedCoupon(null)}
                className="text-xs text-rose-600 underline"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Bill Summary */}
        <div className="bg-white rounded-xl p-3 border border-slate-100 space-y-2 text-xs shadow-2xs">
          <h4 className="font-bold text-slate-900 uppercase tracking-wide">Price Details</h4>
          <div className="flex justify-between text-slate-600">
            <span>Total MRP</span>
            <span>₹{totalOriginal}</span>
          </div>
          <div className="flex justify-between text-emerald-600">
            <span>Discount on MRP</span>
            <span>- ₹{totalOriginal - subtotal}</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Coupon Discount (25%)</span>
              <span>- ₹{couponDiscount}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>Delivery Fee</span>
            <span>{shippingFee === 0 ? "FREE" : `₹${shippingFee}`}</span>
          </div>
          <hr className="border-slate-100" />
          <div className="flex justify-between text-sm font-black text-slate-900">
            <span>Total Amount</span>
            <span>₹{finalTotal}</span>
          </div>
        </div>
      </div>

      {/* Floating Checkout Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 p-3 flex items-center justify-between md:max-w-[430px] md:left-1/2 md:-translate-x-1/2 shadow-lg">
        <div>
          <span className="text-[10px] text-slate-400 block leading-tight font-medium">Total Amount</span>
          <span className="text-base font-black text-slate-900">₹{finalTotal}</span>
        </div>
        <button
          onClick={() => onNavigate("checkout")}
          className="bg-rose-600 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-md shadow-rose-200 active:scale-95 transition"
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
};