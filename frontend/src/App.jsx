
import React, { useEffect, useState } from "react";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { BottomNavigation } from "./components/BottomNavigation/BottomNavigation";
import { FilterDrawer } from "./components/FilterBar/FilterDrawer";

// Pages
import { Home } from "./pages/Home";
import { Products } from "./pages/Products";
import { ProductDetails } from "./pages/ProductDetails";
import { Cart } from "./pages/Cart";
import { Wishlist } from "./pages/Wishlist";
import { Checkout } from "./pages/Checkout";
import { Account } from "./pages/Account";
import { CustomerLogin } from "./pages/CustomerLogin";
import {
  getCurrentCustomer,
  logoutCustomer,
} from "./services/api";

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [customer, setCustomer] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [pendingCheckout, setPendingCheckout] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeGender, setActiveGender] = useState("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [filters, setFilters] = useState({
    category: "all",
    gender: "ALL",
    sort: "recommended",
  });

  // Restore an existing customer session when the app opens.
  useEffect(() => {
    let isMounted = true;

    const checkCustomerSession = async () => {
      try {
        const currentCustomer = await getCurrentCustomer();

        if (isMounted) {
          setCustomer(currentCustomer);
        }
      } catch (error) {
        console.error("Could not restore customer session:", error);
      } finally {
        if (isMounted) {
          setAuthChecking(false);
        }
      }
    };

    checkCustomerSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleNavigate = (page, options = {}) => {
    if (page === "checkout") {
      handleCheckoutNavigation();
      return;
    }

    setCurrentPage(page);

    if (options.subCategory) {
      setSearchQuery(options.subCategory);
    }

    if (options.query !== undefined) {
      setSearchQuery(options.query);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectCategory = (catId) => {
    setCategoryFilter(catId);
    setCurrentPage("catalog");
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setCurrentPage("product-details");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCustomerLoginSuccess = (loggedInCustomer) => {
    setCustomer(loggedInCustomer);

    if (pendingCheckout) {
      setPendingCheckout(false);
      setCurrentPage("checkout");
    } else {
      setCurrentPage("account");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Sign out the customer using the existing backend API.
  const handleCustomerLogout = async () => {
    try {
      await logoutCustomer();

      setCustomer(null);
      setPendingCheckout(false);
      setCurrentPage("home");

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Customer logout failed:", error);
      alert(error.message || "Could not sign out. Please try again.");
    }
  };

  const handleCheckoutNavigation = () => {
    if (authChecking) {
      return;
    }

    if (!customer) {
      setPendingCheckout(true);
      setCurrentPage("customer-login");
      return;
    }

    setCurrentPage("checkout");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <CartProvider>
      <WishlistProvider>
        <div className="min-h-screen w-full bg-white flex flex-col justify-between selection:bg-rose-500 selection:text-white">
          <main className="w-full flex-1 flex flex-col justify-between">
            {currentPage === "home" && (
              <Home
                onNavigate={handleNavigate}
                onSelectCategory={handleSelectCategory}
                onSelectProduct={handleSelectProduct}
                activeGender={activeGender}
                setActiveGender={setActiveGender}
                onOpenFilters={() => setIsFilterOpen(true)}
              />
            )}

            {currentPage === "catalog" && (
              <Products
                category={categoryFilter}
                searchQuery={searchQuery}
                filters={filters}
                onOpenFilters={() => setIsFilterOpen(true)}
                onSelectProduct={handleSelectProduct}
                onBack={() => {
                  setCategoryFilter("all");
                  setSearchQuery("");
                  handleNavigate("home");
                }}
              />
            )}

            {currentPage === "product-details" && selectedProduct && (
              <ProductDetails
                product={selectedProduct}
                onBack={() => handleNavigate("home")}
                onNavigate={handleNavigate}
              />
            )}

            {currentPage === "cart" && (
              <Cart
                onNavigate={handleNavigate}
                onBack={() => handleNavigate("home")}
              />
            )}

            {currentPage === "wishlist" && (
              <Wishlist
                onBack={() => handleNavigate("home")}
                onNavigate={handleNavigate}
                onSelectProduct={handleSelectProduct}
              />
            )}

            {currentPage === "checkout" && (
              <Checkout
                onBack={() => handleNavigate("cart")}
                onNavigate={handleNavigate}
              />
            )}

            {currentPage === "customer-login" && (
              <CustomerLogin
                onBack={() => {
                  setPendingCheckout(false);
                  handleNavigate("home");
                }}
                onLoginSuccess={handleCustomerLoginSuccess}
              />
            )}

            {currentPage === "account" && (
              <Account
  customer={customer}
  onBack={() => handleNavigate("home")}
  onNavigate={handleNavigate}
  onLogout={handleCustomerLogout}
/>
            )}
          </main>

          {["home", "catalog", "account"].includes(currentPage) && (
            <div className="md:hidden">
              <BottomNavigation
                activeTab={
                  categoryFilter !== "all" ? categoryFilter : currentPage
                }
                onTabSelect={(tabId) => {
                  if (tabId === "clothing" || tabId === "footwear") {
                    setCategoryFilter(tabId);
                    handleNavigate("catalog");
                  } else if (tabId === "home") {
                    setCategoryFilter("all");
                    setSearchQuery("");
                    handleNavigate("home");
                  } else {
                    handleNavigate(tabId);
                  }
                }}
              />
            </div>
          )}

          <FilterDrawer
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            filters={filters}
            setFilters={setFilters}
            onReset={() =>
              setFilters({
                category: "all",
                gender: "ALL",
                sort: "recommended",
              })
            }
          />
        </div>
      </WishlistProvider>
    </CartProvider>
  );
}
