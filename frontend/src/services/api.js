const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed with status ${response.status}`
    );
  }

  return data;
}

const api = {
  get(endpoint, options = {}) {
    return apiRequest(endpoint, {
      ...options,
      method: "GET",
    });
  },

  post(endpoint, data = {}, options = {}) {
    return apiRequest(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  put(endpoint, data = {}, options = {}) {
    return apiRequest(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  patch(endpoint, data = {}, options = {}) {
    return apiRequest(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete(endpoint, options = {}) {
    return apiRequest(endpoint, {
      ...options,
      method: "DELETE",
    });
  },
};

export { API_BASE_URL, apiRequest, api };
export default api;