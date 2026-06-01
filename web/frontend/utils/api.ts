const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Definisikan versi-versinya di sini
export const API_V1 = `${BASE_URL}/api/v1`;
export const API_V2 = `${BASE_URL}/api/v2`; // Siap untuk masa depan!

// Endpoint yang di luar /api/v1
export const HEALTH_URL = `${BASE_URL}/health`;
export const LOGS_URL = `${BASE_URL}/logs`