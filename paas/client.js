// Minimal Adobe Commerce (PaaS) REST client. Admin-token handshake, JSON request/response
// with a bearer token, and the product-import call. Node >= 20.14 provides global fetch.

export class PaasClient {
  constructor({ baseUrl, adminUser, adminPassword }) {
    this.baseUrl = baseUrl;
    this.adminUser = adminUser;
    this.adminPassword = adminPassword;
    this.token = null;
  }

  // POST /V1/integration/admin/token — exchange admin user/pass for a bearer token.
  async authenticate() {
    const url = `${this.baseUrl}/rest/V1/integration/admin/token`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: this.adminUser, password: this.adminPassword }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Admin token request failed (${res.status}): ${body.slice(0, 300)}`);
    }
    this.token = await res.json();
    return this.token;
  }

  getHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  // Core request. `path` is relative to /rest (e.g. "/V1/categories"). Returns parsed JSON.
  // `tolerate`: status codes to treat as non-fatal -> returns { tolerated, status, body }.
  async request(method, path, body, { tolerate = [] } = {}) {
    const res = await fetch(`${this.baseUrl}/rest${path}`, {
      method,
      headers: this.getHeaders(),
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      if (tolerate.includes(res.status)) {
        return { tolerated: true, status: res.status, body: text };
      }
      throw new Error(`${method} ${path} failed (${res.status}): ${text.slice(0, 500)}`);
    }

    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  get(path, opts) {
    return this.request("GET", path, undefined, opts);
  }
  post(path, body, opts) {
    return this.request("POST", path, body, opts);
  }
  put(path, body, opts) {
    return this.request("PUT", path, body, opts);
  }
  del(path, opts) {
    return this.request("DELETE", path, undefined, opts);
  }

  // POST /V1/import/json — submit product items to the Adobe Commerce importer. Synchronous:
  // the response is the import log (array of strings). Returns that log for the caller to
  // inspect/summarize.
  async importJson(items, opts = {}) {
    const res = await this.post("/V1/import/json", {
      source: {
        entity: opts.entity ?? "catalog_product",
        behavior: opts.behavior ?? "append",
        validation_strategy: opts.validationStrategy ?? "validation-stop-on-errors",
        allowed_error_count: String(opts.allowedErrorCount ?? 0),
        items,
      },
    });
    if (Array.isArray(res)) return res;
    return res == null ? [] : [String(res)];
  }
}

// Run an async worker over items with bounded concurrency, preserving result order.
export const mapWithConcurrency = async (items, limit, worker) => {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
};
