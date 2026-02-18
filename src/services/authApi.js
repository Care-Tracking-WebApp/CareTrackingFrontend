

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const handleResponse = async (response) => {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error en la solicitud");
  }

  return data;
};

export const register = async ({ name, email, password, phone, role }) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, phone, role })
  });

  return handleResponse(response);
};

export const login = async ({ email, password }) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  return handleResponse(response);
};

export const requestPasswordReset = async ({ email }) => {
  const response = await fetch(`${API_URL}/auth/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });

  return handleResponse(response);
};

export const confirmPasswordReset = async ({ email, code, newPassword }) => {
  const response = await fetch(`${API_URL}/auth/password-reset/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, newPassword })
  });

  return handleResponse(response);
};

export const logout = async () => {
  localStorage.removeItem("user");
  return { message: "Sesión cerrada" };
};

export const getCurrentSession = async () => {
  const user = localStorage.getItem("user");
  if (!user) throw new Error("No hay sesión activa");
  return JSON.parse(user);
};

export const seedDemoUser = async () => {
  // Solo en en estornos de desarrollo
};
