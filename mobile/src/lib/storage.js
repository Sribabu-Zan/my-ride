import * as SecureStore from "expo-secure-store";

// JWT lives in the OS keychain/keystore, not in plain async storage.
const TOKEN_KEY = "auth_token";

export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
