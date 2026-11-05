

export async function getShippingCountries() {
  const response = await api.get("/shipping/countries");
  return response.data?.data || [];
}

export async function getShippingRate(country, city, items) {
  const response = await api.post("/shipping/quote", {
    country,
    city,
    items
  });

  return response.data?.data;
}

export async function createCheckoutOrder(payload) {
  const response = await api.post("/orders", payload);
  return response.data?.data || response.data;
}

export async function createStripeCheckoutSession(orderId) {
  const response = await api.post("/payments/stripe/checkout-session", {
    orderId
  });

  return response.data?.data || response.data;
}
