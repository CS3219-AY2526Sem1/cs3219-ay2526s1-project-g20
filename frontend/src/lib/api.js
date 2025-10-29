export const endpoints = {
  users:       import.meta.env.VITE_USERS_URL       || "http://localhost:8081",
  problems:    import.meta.env.VITE_PROBLEMS_URL    || "http://localhost:8082",
  interviews:  import.meta.env.VITE_INTERVIEWS_URL  || "http://localhost:8083",
  match:       import.meta.env.VITE_MATCH_URL       || "http://localhost:8084",
  ws:          import.meta.env.VITE_WS_URL          || "ws://localhost:8090",
};

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function http(method, base, path, { token, json } = {}) {
  const url = endpoints[base] + path;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: json ? JSON.stringify(json) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export const api = {
  get:  (base, path, opts) => http("GET",  base, path, opts),
  post: (base, path, opts) => http("POST", base, path, opts),
  put:  (base, path, opts) => http("PUT",  base, path, opts),
  del:  (base, path, opts) => http("DELETE", base, path, opts),
};
