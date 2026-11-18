import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  timeout: 10000,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

export const apiMessage = (error) =>
  error?.response?.data?.error?.message || error?.message || "Something went wrong. Please try again.";
