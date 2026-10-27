import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("manpasand_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [appliedCoupon, setAppliedCoupon] = useState(null);

  useEffect(() => {
    localStorage.setItem("manpasand_cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, selectedSize = null, selectedColor = null) => {
    const size = selectedSize || product.sizes?.[0] || "STD";
    const color = selectedColor || product.colors?.[0] || "Default";
    const cartItemId = `${product.id}-${size}-${color}`;

    setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map(item =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, cartItemId, selectedSize: size, selectedColor: color, quantity: 1 }];
    });
  };

  const updateQuantity = (cartItemId, delta) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.cartItemId === cartItemId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (cartItemId) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((acc, item) => acc + item.discountPrice * item.quantity, 0);
  const totalOriginal = cart.reduce((acc, item) => acc + item.originalPrice * item.quantity, 0);
  const couponDiscount = appliedCoupon === "MANPASAND25" ? Math.round(subtotal * 0.25) : 0;
  const shippingFee = subtotal > 999 || subtotal === 0 ? 0 : 79;
  const finalTotal = Math.max(0, subtotal - couponDiscount + shippingFee);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        appliedCoupon,
        setAppliedCoupon,
        subtotal,
        totalOriginal,
        couponDiscount,
        shippingFee,
        finalTotal,
        totalCount: cart.reduce((acc, i) => acc + i.quantity, 0)
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);