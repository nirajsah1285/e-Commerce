import React from "react";
import { Home, Shirt, Footprints, Heart, ShoppingBag } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";

export const BottomNavigation = ({ activeTab, onTabSelect }) => {
  const { totalCount } = useCart();
  const { wishlistCount } = useWishlist();

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "clothing", label: "Clothing", icon: Shirt },
    { id: "footwear", label: "Footwear", icon: Footprints },
    { id: "wishlist", label: "Wishlist", icon: Heart, badge: wishlistCount },
    { id: "cart", label: "Bag", icon: ShoppingBag, badge: totalCount }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/80 px-2 py-1 flex items-center justify-around shadow-lg md:max-w-[430px] md:left-1/2 md:-translate-x-1/2 md:rounded-t-2xl select-none">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabSelect(item.id)}
            className={`relative flex flex-col items-center justify-center flex-1 py-1 transition ${
              isActive ? "text-rose-600 font-bold" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            <div className="relative">
              <Icon size={20} className={isActive ? "scale-110 transition" : ""} />
              {Boolean(item.badge && item.badge > 0) && (
                <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white font-extrabold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};