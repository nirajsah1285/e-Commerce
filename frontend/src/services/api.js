const API_BASE = "http://localhost:5000/api";

export const getProducts = async (category = "all", gender = "ALL", q = "") => {
  const params = new URLSearchParams();
  if (category && category !== "all") params.append("category", category);
  if (gender && gender !== "ALL") params.append("gender", gender);
  if (q) params.append("q", q);

  const res = await fetch(`${API_BASE}/products?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load products from database");
  const data = await res.json();
  return data.products;
};

export const submitOrder = async (orderPayload) => {
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderPayload)
  });
  if (!res.ok) throw new Error("Failed to place order in database");
  return await res.json();
};

const CUSTOMER_AUTH_URL = `${API_BASE}/customer-auth`;

export const requestCustomerOtp = async (details) => {
  const response = await fetch(`${CUSTOMER_AUTH_URL}/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(details),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Could not request email OTP.");
  }

  return data;
};

export const verifyCustomerOtp = async (details) => {
  const response = await fetch(`${CUSTOMER_AUTH_URL}/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(details),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Could not verify email OTP.");
  }

  return data;
};

export const getCurrentCustomer = async () => {
  const response = await fetch(`${CUSTOMER_AUTH_URL}/me`, {
    method: "GET",
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Could not load customer account.");
  }

  return data.customer ?? data;
};

export const logoutCustomer = async () => {
  const response = await fetch(`${CUSTOMER_AUTH_URL}/logout`, {
    method: "POST",
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Could not sign out.");
  }

  return data;
};

const CUSTOMER_ADDRESSES_URL = `${API_BASE}/customer-addresses`;

const addressRequest = async (path = "", options = {}) => {
  const response = await fetch(`${CUSTOMER_ADDRESSES_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || data.message || "Address request failed."
    );
  }

  return data;
};

// Get addresses belonging to the logged-in customer.
export const getCustomerAddresses = async () => {
  const data = await addressRequest();
  return data.addresses ?? [];
};

// Add a delivery address.
export const createCustomerAddress = async (address) => {
  return addressRequest("", {
    method: "POST",
    body: JSON.stringify(address),
  });
};

// Update an existing delivery address.
export const updateCustomerAddress = async (id, address) => {
  return addressRequest(`/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(address),
  });
};

// Set an existing address as the default.
export const setDefaultCustomerAddress = async (id) => {
  return addressRequest(`/${encodeURIComponent(id)}/default`, {
    method: "PATCH",
  });
};

// Delete an existing delivery address.
export const deleteCustomerAddress = async (id) => {
  return addressRequest(`/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};
