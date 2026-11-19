import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  timeout: 90000,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

export const apiMessage = (error) => {
  const fieldErrors = error?.response?.data?.error?.details?.fieldErrors;
  const firstFieldError = fieldErrors
    ? Object.values(fieldErrors).flat().find(Boolean)
    : null;

  return (
    firstFieldError ||
    error?.response?.data?.error?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
};
