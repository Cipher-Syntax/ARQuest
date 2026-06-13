import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'arquest_access_token';
const REFRESH_TOKEN_KEY = 'arquest_refresh_token';

export const authService = {
  async setTokens(access, refresh) {
    if (access) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
    }
    if (refresh) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
    }
  },

  async getAccessToken() {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken() {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  async clearTokens() {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};
