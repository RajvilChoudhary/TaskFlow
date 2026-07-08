/**
 * Centralized configuration for the TaskFlow frontend.
 * Uses environment variables for flexibility between development and production.
 */

// Default to localhost:5000 for development if no env variable is provided
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const config = {
  API_BASE_URL: `${API_BASE_URL}/api`,
  ASSET_URL: API_BASE_URL,
};

export default config;
