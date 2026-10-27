import React, { useState, useEffect } from "react";
import { ChevronRight, Sparkles } from "lucide-react";

const HERO_SLIDES = [
  {
    tag: "MANPASAND FRESH DROP",
    title: "VINTAGE STREETWEAR",
    subtitle: "Heavyweight Boxy Tees & Raw Denim",
    discount: "FLAT 45% OFF",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80"
  },
  {
    tag: "KICKS & SLIDES",
    title: "AEROGLIDE SNEAKERS",
    subtitle: "Cloud Comfort & Chunky Profiles",
    discount: "UP TO 50% OFF",
    image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&q=80"
  },
  {
    tag: "ETHNIC & CASUALS",
    title: "SUMMER ESSENTIALS",
    subtitle: "French Linen Shirts & Tiered Dresses",
    discount: "EXTRA 25% WITH COUPON",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80"
  }
];

export const HeroCarousel = ({ onCtaClick }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[current];

  return (
    <section className="px-3 pt-3">
      <div className="relative rounded-2xl overflow-hidden shadow-md h-48 sm:h-52 bg-slate-900 text-white select-none">
        <img
          src={slide.image}
          alt={slide.title}
          className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay transition-opacity duration-700"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent p-4 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-xs">
              <Sparkles size={10} />
              {slide.tag}
            </span>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-none mt-1">
              {slide.title}
            </h3>
            <p className="text-xs text-slate-300 font-medium">{slide.subtitle}</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-amber-400 font-extrabold text-sm sm:text-base">
                {slide.discount}
              </span>
            </div>

            <button
              onClick={onCtaClick}
              className="bg-white text-slate-900 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-md hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition"
            >
              Shop Now <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Carousel Dots */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
          {HERO_SLIDES.map((_, i) => (
            <span
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === current ? "w-5 bg-rose-600" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};