import { JSONFilePreset } from "lowdb/node";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initial catalog data for MANPASAND Clothing & Footwear
const defaultData = {
  products: [
    {
      id: "mp-cl-1",
      name: "MANPASAND Oversized Heavyweight Cotton Tee",
      category: "clothing",
      subCategory: "T-Shirts",
      gender: "MEN",
      originalPrice: 1499,
      discountPrice: 799,
      discountBadge: "47% OFF",
      rating: 4.6,
      reviewsCount: 384,
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: ["Jet Black", "Ivory White", "Sage Green"],
      image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=700&q=80",
      description: "Crafted from 240 GSM combed bio-washed cotton. Relaxed drop-shoulder silhouette."
    },
    {
      id: "mp-cl-2",
      name: "MANPASAND Vintage Selvedge Straight Denim",
      category: "clothing",
      subCategory: "Jeans",
      gender: "MEN",
      originalPrice: 3299,
      discountPrice: 1899,
      discountBadge: "42% OFF",
      rating: 4.7,
      reviewsCount: 210,
      sizes: ["30", "32", "34", "36"],
      colors: ["Classic Indigo", "Washed Charcoal"],
      image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=700&q=80",
      description: "Authentic 13.5oz rigid selvedge denim treated with subtle whiskers."
    },
    {
      id: "mp-cl-3",
      name: "MANPASAND Floral Tiered Summer Midi Dress",
      category: "clothing",
      subCategory: "Dresses",
      gender: "WOMEN",
      originalPrice: 2899,
      discountPrice: 1499,
      discountBadge: "48% OFF",
      rating: 4.8,
      reviewsCount: 520,
      sizes: ["XS", "S", "M", "L"],
      colors: ["Blush Coral", "Sky Blue"],
      image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=700&q=80",
      description: "Airy flared chiffon silhouette with smocked waist."
    },
    {
      id: "mp-fw-1",
      name: "MANPASAND AeroGlide Retro Court Sneakers",
      category: "footwear",
      subCategory: "Sneakers",
      gender: "MEN",
      originalPrice: 4499,
      discountPrice: 2499,
      discountBadge: "44% OFF",
      rating: 4.9,
      reviewsCount: 820,
      sizes: ["UK 7", "UK 8", "UK 9", "UK 10"],
      colors: ["Triple White", "Panda Mono"],
      image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=700&q=80",
      description: "Perforated leather upper with high-rebound memory foam insoles."
    },
    {
      id: "mp-fw-2",
      name: "MANPASAND Ankle-Strap Evening Block Heels",
      category: "footwear",
      subCategory: "Heels",
      gender: "WOMEN",
      originalPrice: 3499,
      discountPrice: 1899,
      discountBadge: "45% OFF",
      rating: 4.6,
      reviewsCount: 290,
      sizes: ["UK 4", "UK 5", "UK 6", "UK 7"],
      colors: ["Nude Blush", "Satin Noir"],
      image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=700&q=80",
      description: "3.0-inch block heel engineered with padded arch cushions."
    }
  ],
  orders: []
};

// Creates and reads local database file at backend/manpasand.db.json
const dbPath = path.join(__dirname, "manpasand.db.json");
const db = await JSONFilePreset(dbPath, defaultData);

export default db;