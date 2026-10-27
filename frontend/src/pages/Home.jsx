
import React, { useState, useEffect } from "react";
import { DeliveryBar } from "../components/Header/DeliveryBar";
import { SearchHeader } from "../components/Header/SearchHeader";
import { GenderTabs } from "../components/MainTabs/GenderTabs";
import { HeroCarousel } from "../components/HeroCarousel/HeroCarousel";
import { MainCategoryCards } from "../components/CategorySection/MainCategoryCards";
import { PopularSubcategories } from "../components/CategorySection/PopularSubcategories";
import { CouponBanner } from "../components/Banners/CouponBanner";
import { BankOfferBanner } from "../components/Banners/BankOfferBanner";
import { ProductRowSection } from "../components/ProductSection/ProductRowSection";
import { PRODUCTS as fallbackProducts } from "../data/products";
import { getProducts } from "../services/api";

export const Home = ({
  onNavigate,
  onSelectCategory,
  onSelectProduct,
  activeGender,
  setActiveGender,
  onOpenFilters
}) => {
  const [products, setProducts] = useState([]);
  const [dataSource, setDataSource] = useState("Loading...");

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      try {
        const liveProducts = await getProducts();

        if (active) {
          setProducts(Array.isArray(liveProducts) ? liveProducts : []);
          setDataSource("Live Backend Database");
        }
      } catch {
        if (active) {
          setProducts(fallbackProducts);
          setDataSource("Static Fallback");
        }
      }
    };

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  const visibleProducts = activeGender === "ALL"
    ? products
    : products.filter((product) => product.gender === activeGender);

  const trending = visibleProducts.slice(0, 4);
  const bestsellers = visibleProducts.slice(1, 5);
  const newArrivals = visibleProducts.slice(2, 6);

  return (
    <div className="pb-24 md:pb-16 bg-white min-h-screen w-full">
      <DeliveryBar />

      <SearchHeader
        onNavigate={onNavigate}
        onSearch={(query) => onNavigate("catalog", { query })}
      />

      <div className="px-4 md:px-10 lg:px-16 pt-2">
        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
            dataSource === "Live Backend Database"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : dataSource === "Static Fallback"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-slate-50 text-slate-500 border-slate-200"
          }`}
        >
          ● Server Status: {dataSource}
        </span>
      </div>

      <div className="px-4 md:px-10 lg:px-16">
        <GenderTabs
          activeGender={activeGender}
          onSelectGender={setActiveGender}
          onOpenFilters={onOpenFilters}
        />
      </div>

      <div className="px-4 md:px-10 lg:px-16 space-y-4">
        <MainCategoryCards onSelectCategory={onSelectCategory} />
        <CouponBanner />

        <HeroCarousel onCtaClick={() => onNavigate("catalog")} />

        <BankOfferBanner />

        <PopularSubcategories
          activeCategory="all"
          onSelectSubCategory={(subName) =>
            onNavigate("catalog", { subCategory: subName })
          }
        />

        <ProductRowSection
          title="Trending Fits & Kicks"
          products={trending}
          onSeeAll={() => onNavigate("catalog")}
          onSelectProduct={onSelectProduct}
        />

        <ProductRowSection
          title="MANPASAND Best Sellers"
          products={bestsellers}
          onSeeAll={() => onNavigate("catalog")}
          onSelectProduct={onSelectProduct}
        />

        <ProductRowSection
          title="Fresh New Arrivals"
          products={newArrivals}
          onSeeAll={() => onNavigate("catalog")}
          onSelectProduct={onSelectProduct}
        />
      </div>
    </div>
  );
};

export default Home;
