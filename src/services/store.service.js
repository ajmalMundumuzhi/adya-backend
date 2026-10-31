export async function getProductsPage(params = {}) {
  const response = await api.get("/products", { params });
  return response.data;
}