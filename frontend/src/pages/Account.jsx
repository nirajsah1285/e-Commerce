
import React, { useEffect, useState } from "react";
import {
  Package,
  Heart,
  MapPin,
  Settings,
  LogOut,
  ArrowLeft,
  ShieldCheck,
  ChevronRight,
  Bell,
  UserRound,
  Info,
  Plus,
  Pencil,
  Trash2,
  Star,
  X,
  Loader,
} from "lucide-react";
import {
  getCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  setDefaultCustomerAddress,
  deleteCustomerAddress,
} from "../services/api";

const EMPTY_ADDRESS = {
  recipient_name: "",
  phone: "",
  province: "Madhesh Province",
  district: "Sarlahi",
  municipality: "",
  ward: "",
  village_tole: "",
  full_address: "",
  map_lat: "",
  map_lng: "",
};

export const Account = ({ onBack, onNavigate, onLogout, customer }) => {
  const [section, setSection] = useState("menu");
  const [addresses, setAddresses] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [addressNotice, setAddressNotice] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [addressForm, setAddressForm] = useState({ ...EMPTY_ADDRESS });

  const openSection = (nextSection) => {
    setSection(nextSection);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const displayName =
    customer?.fullName ||
    customer?.full_name ||
    customer?.name ||
    "Manpasand Customer";

  const displayEmail = customer?.email || "Email not available";

  const menuButton =
    "w-full px-4 py-3.5 flex items-center justify-between text-slate-700 hover:bg-slate-50 transition";

  const backToMenu = () => openSection("menu");

  const loadAddresses = async () => {
    setAddressLoading(true);
    setAddressError("");

    try {
      const result = await getCustomerAddresses();
      setAddresses(result);
    } catch (error) {
      setAddressError(error.message || "Could not load addresses.");
    } finally {
      setAddressLoading(false);
    }
  };

  useEffect(() => {
    if (section === "addresses") {
      loadAddresses();
    }
  }, [section]);

  const renderHeader = (title) => (
    <div className="sticky top-0 z-30 bg-white border-b border-slate-100 px-3 py-3 flex items-center gap-2">
      <button
        type="button"
        onClick={section === "menu" ? onBack : backToMenu}
        aria-label="Go back"
        className="p-1 text-slate-700 hover:text-slate-950 transition active:scale-90"
      >
        <ArrowLeft size={18} />
      </button>
      <h1 className="text-sm font-extrabold text-slate-900">{title}</h1>
    </div>
  );

  const startNewAddress = () => {
    setEditingId(null);
    setAddressForm({ ...EMPTY_ADDRESS });
    setAddressError("");
    setAddressNotice("");
    setShowAddressForm(true);
  };

  const startEditAddress = (address) => {
    setEditingId(address.id);
    setAddressForm({
      recipient_name: address.recipient_name || "",
      phone: address.phone || "",
      province: address.province || "",
      district: address.district || "",
      municipality: address.municipality || "",
      ward: address.ward || "",
      village_tole: address.village_tole || "",
      full_address: address.full_address || "",
      map_lat: address.map_lat ?? "",
      map_lng: address.map_lng ?? "",
    });
    setAddressError("");
    setAddressNotice("");
    setShowAddressForm(true);
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setAddressForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSaveAddress = async (event) => {
    event.preventDefault();
    setAddressError("");
    setAddressNotice("");
    setAddressSaving(true);

    const payload = {
      ...addressForm,
      map_lat:
        addressForm.map_lat === "" ? null : Number(addressForm.map_lat),
      map_lng:
        addressForm.map_lng === "" ? null : Number(addressForm.map_lng),
    };

    try {
      if (editingId !== null) {
        await updateCustomerAddress(editingId, payload);
        setAddressNotice("Address updated successfully.");
      } else {
        await createCustomerAddress(payload);
        setAddressNotice("Address saved successfully.");
      }

      setShowAddressForm(false);
      setEditingId(null);
      setAddressForm({ ...EMPTY_ADDRESS });
      await loadAddresses();
    } catch (error) {
      setAddressError(error.message || "Could not save your address.");
    } finally {
      setAddressSaving(false);
    }
  };

  const handleSetDefault = async (id) => {
    setAddressError("");
    setAddressNotice("");

    try {
      await setDefaultCustomerAddress(id);
      setAddressNotice("Default address updated.");
      await loadAddresses();
    } catch (error) {
      setAddressError(error.message || "Could not set the default address.");
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm("Delete this delivery address?")) return;

    setAddressError("");
    setAddressNotice("");

    try {
      await deleteCustomerAddress(id);
      setAddressNotice("Address deleted.");
      await loadAddresses();
    } catch (error) {
      setAddressError(error.message || "Could not delete the address.");
    }
  };

  if (section === "orders") {
    return (
      <div className="pb-24 bg-slate-50 min-h-screen">
        {renderHeader("My Orders & Tracking")}
        <div className="p-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
            <Package size={32} className="mx-auto text-slate-400" />
            <h2 className="mt-3 font-bold text-slate-900">Your orders</h2>
            <p className="mt-2 text-sm text-slate-500">
              Order history and delivery tracking will appear here when
              connected to your Manpasand order system.
            </p>
            <p className="mt-3 text-xs text-slate-400">
              No order information is being displayed yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (section === "addresses") {
    return (
      <div className="pb-24 bg-slate-50 min-h-screen">
        {renderHeader("Manage Addresses")}

        <div className="p-4 space-y-4">
          {addressError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {addressError}
              {addressError.toLowerCase().includes("log in") && (
                <button
                  type="button"
                  onClick={() => onNavigate("customer-login")}
                  className="ml-2 font-bold underline"
                >
                  Log in
                </button>
              )}
            </div>
          )}

          {addressNotice && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
            >
              {addressNotice}
            </div>
          )}

          {!showAddressForm && (
            <button
              type="button"
              onClick={startNewAddress}
              className="w-full rounded-xl border border-rose-200 bg-white p-4 flex items-center justify-center gap-2 text-sm font-bold text-rose-600 hover:bg-rose-50"
            >
              <Plus size={18} />
              Add New Address
            </button>
          )}

          {showAddressForm && (
            <form
              onSubmit={handleSaveAddress}
              className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-extrabold text-slate-900">
                  {editingId !== null ? "Edit Address" : "New Delivery Address"}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressForm(false);
                    setEditingId(null);
                    setAddressError("");
                  }}
                  aria-label="Close address form"
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              {[
                ["recipient_name", "Recipient full name", "Enter recipient name"],
                ["phone", "Phone number", "Enter contact phone number"],
                ["province", "Province", "Enter province"],
                ["district", "District", "Enter district"],
                ["municipality", "Municipality / Rural Municipality", "Enter municipality"],
                ["ward", "Ward number", "Enter ward number"],
                ["village_tole", "Village / Tole", "Enter village or tole"],
              ].map(([name, label, placeholder]) => (
                <label key={name} className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">{label}</span>
                  <input
                    name={name}
                    value={addressForm[name]}
                    onChange={updateField}
                    placeholder={placeholder}
                    required
                    maxLength={name === "recipient_name" ? 150 : name === "municipality" || name === "village_tole" ? 150 : name === "phone" ? 20 : name === "ward" ? 20 : 100}
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-rose-400"
                  />
                </label>
              ))}

              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">
                  Full address / delivery directions
                </span>
                <textarea
                  name="full_address"
                  value={addressForm.full_address}
                  onChange={updateField}
                  placeholder="House, street, nearby landmark..."
                  required
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-rose-400"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">
                    Map latitude (optional)
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    name="map_lat"
                    value={addressForm.map_lat}
                    onChange={updateField}
                    placeholder="Latitude"
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-rose-400"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-700">
                    Map longitude (optional)
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    name="map_lng"
                    value={addressForm.map_lng}
                    onChange={updateField}
                    placeholder="Longitude"
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-rose-400"
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressForm(false);
                    setEditingId(null);
                    setAddressError("");
                  }}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addressSaving}
                  className="flex-1 rounded-xl bg-rose-600 px-3 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {addressSaving ? "Saving..." : editingId !== null ? "Save Changes" : "Save Address"}
                </button>
              </div>
            </form>
          )}

          {addressLoading ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-500">
              <Loader size={24} className="mx-auto animate-spin" />
              <p className="mt-2 text-sm">Loading your addresses...</p>
            </div>
          ) : addresses.length === 0 && !showAddressForm ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
              <MapPin size={32} className="mx-auto text-slate-400" />
              <h2 className="mt-3 font-bold text-slate-900">
                No saved addresses
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Add a delivery address so you can use it when ordering from
                Manpasand.
              </p>
            </div>
          ) : (
            addresses.map((address) => (
              <article
                key={address.id}
                className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center flex-wrap gap-2">
                      <h3 className="font-extrabold text-slate-900">
                        {address.recipient_name}
                      </h3>
                      {Boolean(address.is_default) && (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{address.phone}</p>
                  </div>
                  <MapPin size={20} className="shrink-0 text-rose-500" />
                </div>

                <p className="text-sm leading-6 text-slate-600">
                  {address.full_address}
                  <br />
                  {address.village_tole}, Ward {address.ward}
                  <br />
                  {address.municipality}, {address.district}
                  <br />
                  {address.province}
                </p>

                {address.map_lat != null && address.map_lng != null && (
                  <p className="text-xs text-slate-400">
                    Map coordinates saved
                  </p>
                )}

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {!Boolean(address.is_default) && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(address.id)}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                    >
                      <Star size={14} />
                      Set Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startEditAddress(address)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(address.id)}
                    className="flex items-center gap-1 rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-600"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    );
  }

  if (section === "settings") {
    return (
      <div className="pb-24 bg-slate-50 min-h-screen">
        {renderHeader("Settings & Notifications")}
        <div className="p-4 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-3">
            <UserRound size={20} className="text-slate-500 mt-1" />
            <div>
              <h2 className="font-bold text-sm text-slate-900">Account details</h2>
              <p className="mt-1 text-sm text-slate-500">{displayName}</p>
              <p className="text-sm text-slate-500">{displayEmail}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-3">
            <Bell size={20} className="text-slate-500 mt-1" />
            <div>
              <h2 className="font-bold text-sm text-slate-900">Notifications</h2>
              <p className="mt-1 text-sm text-slate-500">
                Notification preferences are not available yet.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-3">
            <Info size={20} className="text-slate-500 mt-1" />
            <div>
              <h2 className="font-bold text-sm text-slate-900">Account security</h2>
              <p className="mt-1 text-sm text-slate-500">
                Your sign-in uses email verification. Never share your OTP.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-slate-50 min-h-screen">
      {renderHeader("My Account")}

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-lg">
            {displayName
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0].toUpperCase())
              .join("") || "MP"}
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-900">{displayName}</h2>
            <p className="text-xs text-slate-400 break-all">{displayEmail}</p>
            <span className="inline-block mt-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              MANPASAND CUSTOMER
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden shadow-xs text-xs">
          <button type="button" onClick={() => openSection("orders")} className={menuButton}>
            <span className="flex items-center gap-2.5">
              <Package size={16} className="text-slate-500" />
              <span className="font-semibold">My Orders & Tracking</span>
            </span>
            <ChevronRight size={15} className="text-slate-400" />
          </button>

          <button type="button" onClick={() => onNavigate("wishlist")} className={menuButton}>
            <span className="flex items-center gap-2.5">
              <Heart size={16} className="text-slate-500" />
              <span className="font-semibold">Saved Wishlist</span>
            </span>
            <ChevronRight size={15} className="text-slate-400" />
          </button>

          <button type="button" onClick={() => openSection("addresses")} className={menuButton}>
            <span className="flex items-center gap-2.5">
              <MapPin size={16} className="text-slate-500" />
              <span className="font-semibold">Manage Addresses</span>
            </span>
            <ChevronRight size={15} className="text-slate-400" />
          </button>

          <button type="button" onClick={() => openSection("settings")} className={menuButton}>
            <span className="flex items-center gap-2.5">
              <Settings size={16} className="text-slate-500" />
              <span className="font-semibold">Settings & Notifications</span>
            </span>
            <ChevronRight size={15} className="text-slate-400" />
          </button>

          <button type="button" onClick={onLogout} className="w-full px-4 py-3.5 flex items-center justify-between text-rose-600 hover:bg-rose-50 font-bold transition">
            <span className="flex items-center gap-2.5">
              <LogOut size={16} />
              <span>Sign Out</span>
            </span>
          </button>
        </div>

        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck size={14} className="text-emerald-600" />
            MANPASAND Verified Fashion Marketplace v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};
