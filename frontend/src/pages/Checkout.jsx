
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  ShieldCheck,
  Truck,
  Banknote,
  MapPin,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useCart } from "../context/CartContext";

const API_URL = "http://localhost:5000/api";

const PROVINCES = [
  "Koshi Province",
  "Madhesh Province",
  "Bagmati Province",
  "Gandaki Province",
  "Lumbini Province",
  "Karnali Province",
  "Sudurpashchim Province",
];

const money = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString("en-IN")}`;

const initialForm = {
  name: "",
  phone: "",
  province: "Madhesh Province",
  district: "",
  municipality: "",
  ward: "",
  villageTole: "",
  address: "",
  mapLat: "",
  mapLng: "",
};

export const Checkout = ({ onBack, onNavigate }) => {
  const {
    cart,
    subtotal,
    couponDiscount = 0,
    appliedCoupon,
    clearCart,
  } = useCart();

  const [formData, setFormData] = useState(initialForm);
  const [paymentMethod, setPaymentMethod] = useState("COD");

  const [deliveryResult, setDeliveryResult] = useState(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const mapLocation = useMemo(() => {
    if (
      formData.mapLat.trim() === "" ||
      formData.mapLng.trim() === ""
    ) {
      return null;
    }

    const lat = Number(formData.mapLat);
    const lng = Number(formData.mapLng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return null;
    }

    return { lat, lng };
  }, [formData.mapLat, formData.mapLng]);

  const deliveryFee = Number(deliveryResult?.deliveryFee ?? 0);

  const finalTotal = Math.max(
    0,
    Number(subtotal || 0) -
      Number(couponDiscount || 0) +
      deliveryFee
  );

  const isMadhesh = formData.province === "Madhesh Province";

  const canSubmit =
    cart.length > 0 &&
    Boolean(deliveryResult?.valid) &&
    Boolean(deliveryResult?.canPlaceOrder) &&
    !deliveryLoading &&
    !deliveryError &&
    !isSubmitting;

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrorMessage("");
  };

  // Calculate delivery through the existing backend API.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const calculate = async () => {
      setDeliveryResult(null);
      setDeliveryError("");

      if (
        !formData.province ||
        !formData.district.trim() ||
        !formData.municipality.trim()
      ) {
        setDeliveryLoading(false);
        return;
      }

      // Current configured home-delivery zones are in Madhesh.
      // Other provinces cannot be ordered until pickup branches
      // have been verified and configured.
      if (!isMadhesh) {
        setDeliveryLoading(false);
        setDeliveryResult({
          valid: true,
          eligible: true,
          deliveryMethod: "BRANCH_PICKUP",
          deliveryFee: 40,
          canPlaceOrder: false,
          message:
            "Home delivery is not configured for this province. A verified pickup branch must be configured before ordering.",
        });
        return;
      }

      setDeliveryLoading(true);

      try {
        const response = await fetch(
          `${API_URL}/delivery/calculate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify({
              province: formData.province,
              district: formData.district.trim(),
              municipality: formData.municipality.trim(),
              ward: formData.ward.trim(),
              villageTole: formData.villageTole.trim(),
              address: formData.address.trim(),
              mapLocation,
            }),
          }
        );

        const data = await response.json();

        if (cancelled) return;

        if (!response.ok || !data.success) {
          setDeliveryResult(data);
          setDeliveryError(
            data.message || "Could not calculate delivery."
          );
          return;
        }

        setDeliveryResult(data);
      } catch (error) {
        if (error.name === "AbortError" || cancelled) return;

        setDeliveryResult(null);
        setDeliveryError(
          "Cannot connect to the Manpasand server. Check that your backend is running."
        );
      } finally {
        if (!cancelled) {
          setDeliveryLoading(false);
        }
      }
    };

    calculate();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    formData.province,
    formData.district,
    formData.municipality,
    formData.ward,
    formData.villageTole,
    formData.address,
    mapLocation,
    isMadhesh,
  ]);

  const useCurrentLocation = () => {
    setErrorMessage("");

    if (!navigator.geolocation) {
      setErrorMessage(
        "Your browser does not support location access. Enter coordinates manually."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((previous) => ({
          ...previous,
          mapLat: String(position.coords.latitude),
          mapLng: String(position.coords.longitude),
        }));
      },
      () => {
        setErrorMessage(
          "Location access was not granted. Allow location access or enter coordinates manually."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmitOrder = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (cart.length === 0) {
      setErrorMessage("Your cart is empty.");
      return;
    }

    if (!isMadhesh) {
      setErrorMessage(
        "Ordering is unavailable until a verified pickup branch is configured for this province."
      );
      return;
    }

    if (
      !deliveryResult?.valid ||
      !deliveryResult?.canPlaceOrder
    ) {
      setErrorMessage(
        deliveryResult?.message ||
          "Complete your delivery address and required location details first."
      );
      return;
    }

    if (
      deliveryResult.requiresMapLocation &&
      !mapLocation
    ) {
      setErrorMessage(
        "Add a valid map location before ordering in this town."
      );
      return;
    }

    if (
      paymentMethod !== "COD"
    ) {
      setErrorMessage(
        "Online payments are not available yet. Please select Cash on Delivery."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate the coupon with the backend before submitting.
      let verifiedCouponDiscount = 0;

      if (appliedCoupon) {
        const couponResponse = await fetch(
          `${API_URL}/coupons/validate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code: appliedCoupon,
              subtotal: Number(subtotal || 0),
            }),
          }
        );

        const couponData = await couponResponse.json();

        if (!couponResponse.ok || !couponData.valid) {
          throw new Error(
            couponData.message || "Your coupon is no longer valid."
          );
        }

        verifiedCouponDiscount = Number(
          couponData.discountAmount || 0
        );
      }

      // Recalculate the displayed total using the verified coupon
      // response and the delivery fee returned by the delivery API.
      const orderTotal = Math.max(
        0,
        Number(subtotal || 0) -
          verifiedCouponDiscount +
          Number(deliveryResult.deliveryFee || 0)
      );

      const customer = {
        ...formData,
        mapLocation,
        deliveryMethod: deliveryResult.deliveryMethod,
        deliveryFee: Number(deliveryResult.deliveryFee || 0),
      };

      const orderPayload = {
        customer,
        items: cart,
        subtotal: Number(subtotal || 0),
        couponCode: appliedCoupon || null,
        couponDiscount: verifiedCouponDiscount,
        delivery: deliveryResult,
        deliveryFee: Number(deliveryResult.deliveryFee || 0),
        totalAmount: orderTotal,
        paymentMethod: "COD",
      };

      const response = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.orderId) {
        throw new Error(
          data.message ||
            data.error ||
            "The server could not confirm your order."
        );
      }

      setPlacedOrderId(data.orderId);
      setOrderComplete(true);
      clearCart();
    } catch (error) {
      // Never invent an order number or clear the cart on failure.
      setErrorMessage(
        error.message ||
          "Unable to place your order. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-3xl p-8 text-center shadow-lg border border-slate-100 space-y-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={36} />
          </div>

          <h2 className="text-xl font-black text-slate-900">
            Order Placed Successfully!
          </h2>

          <p className="text-xs text-slate-500">
            Thank you for shopping with MANPASAND. Your order
            confirmation ID is:
          </p>

          <div className="bg-slate-50 py-2.5 px-4 rounded-xl font-mono text-sm font-black text-rose-600 border border-slate-200 inline-block">
            {placedOrderId}
          </div>

          <div className="text-left bg-slate-50 rounded-xl p-4 text-xs space-y-2">
            <p>
              <span className="font-bold">Payment:</span>{" "}
              Cash on Delivery
            </p>
            <p>
              <span className="font-bold">Delivery:</span>{" "}
              {deliveryResult?.deliveryMethod === "HOME_DELIVERY"
                ? "Home delivery"
                : "Branch pickup"}
            </p>
            <p>
              <span className="font-bold">Total:</span>{" "}
              {money(finalTotal)}
            </p>
          </div>

          <p className="text-xs text-slate-400">
            Confirmation messages are not connected yet. Keep your
            order ID for reference.
          </p>

          <button
            onClick={() => onNavigate?.("home")}
            className="w-full py-3.5 bg-rose-600 text-white font-black text-xs rounded-xl shadow-md hover:bg-rose-700 transition"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 md:px-10 py-3.5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1 text-slate-700 hover:text-slate-950 transition"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <h1 className="text-base md:text-lg font-black text-slate-900">
            Checkout
          </h1>
        </div>

        <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
          <ShieldCheck size={16} />
          <span>Secure Checkout</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Truck size={16} className="text-rose-600" />
              Delivery Address
            </h2>

            <form
              id="checkout-form"
              onSubmit={handleSubmitOrder}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Full Name
                </label>
                <input
                  name="name"
                  required
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Nepal Mobile Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="98XXXXXXXX"
                  title="Enter a 10-digit mobile number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Province
                </label>
                <select
                  name="province"
                  required
                  value={formData.province}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-rose-500"
                >
                  {PROVINCES.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Current home-delivery coverage is configured for
                  Madhesh Province.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    District
                  </label>
                  <input
                    name="district"
                    required
                    value={formData.district}
                    onChange={handleInputChange}
                    placeholder="e.g. Sarlahi"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Municipality / Rural Municipality
                  </label>
                  <input
                    name="municipality"
                    required
                    value={formData.municipality}
                    onChange={handleInputChange}
                    placeholder="e.g. Malangawa"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Ward Number
                  </label>
                  <input
                    name="ward"
                    required
                    value={formData.ward}
                    onChange={handleInputChange}
                    placeholder="e.g. 5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Village / Tole
                  </label>
                  <input
                    name="villageTole"
                    required
                    value={formData.villageTole}
                    onChange={handleInputChange}
                    placeholder="Enter village or tole"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Full Address / House Number
                </label>
                <textarea
                  name="address"
                  required
                  rows={3}
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="House number, street, nearby landmark"
                  className="w-full resize-y bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin size={18} className="text-rose-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-slate-800">
                      Map Location
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Required for Rs. 40 home delivery in selected
                      towns. You can use your current location or enter
                      coordinates.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={useCurrentLocation}
                  className="w-full border border-rose-200 text-rose-700 bg-rose-50 rounded-xl py-2.5 text-xs font-bold hover:bg-rose-100 transition"
                >
                  Use My Current Location
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Latitude
                    </label>
                    <input
                      name="mapLat"
                      inputMode="decimal"
                      value={formData.mapLat}
                      onChange={handleInputChange}
                      placeholder="e.g. 26.98"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Longitude
                    </label>
                    <input
                      name="mapLng"
                      inputMode="decimal"
                      value={formData.mapLng}
                      onChange={handleInputChange}
                      placeholder="e.g. 85.56"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {formData.mapLat && formData.mapLng && !mapLocation && (
                  <p className="text-xs text-rose-600">
                    Enter valid latitude and longitude values.
                  </p>
                )}

                {mapLocation && (
                  <p className="text-[11px] text-emerald-700">
                    Location coordinates entered: {mapLocation.lat},{" "}
                    {mapLocation.lng}
                  </p>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Payment Method
            </h2>

            <button
              type="button"
              onClick={() => setPaymentMethod("COD")}
              className="w-full p-4 rounded-xl border border-rose-600 bg-rose-50 text-rose-700 text-left flex items-center gap-3"
            >
              <Banknote size={22} />
              <div>
                <p className="text-xs font-black">Cash on Delivery</p>
                <p className="text-[11px] text-slate-500">
                  Pay when your order is delivered
                </p>
              </div>
              <CheckCircle size={18} className="ml-auto" />
            </button>

            <p className="text-[11px] text-slate-400">
              Online payments are not enabled yet.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Order Summary ({cart.length} products)
            </h3>

            {cart.length === 0 ? (
              <p className="text-xs text-slate-500">
                Your cart is empty.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-3 divide-y divide-slate-100">
                {cart.map((item) => (
                  <div
                    key={item.cartItemId || item.id}
                    className="pt-3 first:pt-0 flex items-center gap-3"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-14 object-cover rounded-lg bg-slate-100"
                    />

                    <div className="flex-1 min-w-0 text-xs">
                      <p className="font-bold text-slate-800 line-clamp-2">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Qty: {item.quantity || 1} · Size:{" "}
                        {item.selectedSize || "STD"}
                      </p>
                      <p className="font-black text-slate-900 mt-1">
                        {money(
                          Number(item.discountPrice || 0) *
                            Number(item.quantity || 1)
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <hr className="border-slate-100" />

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 gap-3">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>

              {Number(couponDiscount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold gap-3">
                  <span>
                    Coupon {appliedCoupon ? `(${appliedCoupon})` : "Discount"}
                  </span>
                  <span>-{money(couponDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 gap-3">
                <span>Delivery</span>
                <span className="font-bold text-right">
                  {deliveryLoading
                    ? "Calculating..."
                    : deliveryResult?.valid
                      ? money(deliveryFee)
                      : "Enter location"}
                </span>
              </div>

              {deliveryResult?.deliveryMethod && (
                <div className="rounded-xl bg-slate-50 p-3 space-y-1">
                  <p className="font-bold text-slate-800">
                    {deliveryResult.deliveryMethod === "HOME_DELIVERY"
                      ? "Home Delivery"
                      : "Branch Pickup"}
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    {deliveryResult.message}
                  </p>
                </div>
              )}

              {deliveryLoading && (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Checking delivery eligibility...</span>
                </div>
              )}

              {deliveryError && (
                <div className="flex items-start gap-2 text-rose-600">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <p>{deliveryError}</p>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-slate-900 pt-3 border-t border-slate-100 gap-3">
                <span>Total Amount</span>
                <span className="text-right">
                  {money(finalTotal)}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}

            <button
              form="checkout-form"
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? "Placing Order..."
                : deliveryLoading
                  ? "Checking Delivery..."
                  : `Confirm Order (${money(finalTotal)})`}
            </button>

            <p className="text-[10px] leading-relaxed text-slate-400">
              Order confirmation depends on the server successfully
              saving your order. Please do not submit repeatedly while
              the order is processing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
