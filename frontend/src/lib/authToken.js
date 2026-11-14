// frontend/src/lib/authToken.js
//
// The jwt cookie is httpOnly, so JavaScript can never read it back - the
// Socket.IO handshake and any cross-site request that a browser strips
// third-party cookies from need the token in hand. The server now returns it
// on login/signup and we keep a copy here.
const TOKEN_KEY = "chatbox-token";

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable (private mode) - cookie auth still works same-site */
  }
};

export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nothing to do */
  }
};
