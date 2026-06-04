import axios from "axios";
import { API_BASE_URL } from "./config";
import { getToken, clearToken } from "./storage";

// Single axios instance for the whole app. Interceptors attach the auth token
// and normalize errors so screens don't repeat header/error boilerplate.
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await clearToken();
    }
    return Promise.reject(error);
  }
);

export default api;
