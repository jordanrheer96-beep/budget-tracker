// This file replaces Claude's window.storage API with a version backed by
// Supabase, so data is shared live across every device (your phone, your
// partner's phone, laptops, etc.) instead of being stuck on one device.
//
// IMPORTANT: replace the two placeholder values below with your own
// Supabase Project URL and publishable (anon) key from:
// Project Settings -> API in your Supabase dashboard.
// Never put your service_role key here — only the publishable/anon key.

const SUPABASE_URL = "https://dmglgbcheeiqptaryseg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_h_ZAoXXXFYI-ahCJhhNYmA_PzKknRrI";

(function () {
  if (window.storage) return; // already provided (e.g. inside Claude)

  const REST_URL = SUPABASE_URL + "/rest/v1/budget_data";
  const HEADERS = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: "Bearer " + SUPABASE_ANON_KEY,
  };

  window.storage = {
    async get(key) {
      const response = await fetch(
        REST_URL + "?key=eq." + encodeURIComponent(key) + "&select=key,value",
        { headers: HEADERS }
      );
      if (!response.ok) {
        throw new Error("Supabase get failed: " + response.status);
      }
      const rows = await response.json();
      if (!rows || rows.length === 0) {
        throw new Error("Key not found: " + key);
      }
      return { key: rows[0].key, value: rows[0].value, shared: true };
    },

    async set(key, value) {
      try {
        const response = await fetch(REST_URL, {
          method: "POST",
          headers: { ...HEADERS, Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
        });
        if (!response.ok) {
          console.error("Supabase set failed", response.status, await response.text());
          return null;
        }
        return { key, value, shared: true };
      } catch (err) {
        console.error("Supabase set error", err);
        return null;
      }
    },

    async delete(key) {
      try {
        const response = await fetch(REST_URL + "?key=eq." + encodeURIComponent(key), {
          method: "DELETE",
          headers: HEADERS,
        });
        if (!response.ok) {
          console.error("Supabase delete failed", response.status);
          return null;
        }
        return { key, deleted: true, shared: true };
      } catch (err) {
        console.error("Supabase delete error", err);
        return null;
      }
    },

    async list(prefix) {
      try {
        const url = prefix
          ? REST_URL + "?key=like." + encodeURIComponent(prefix) + "*&select=key"
          : REST_URL + "?select=key";
        const response = await fetch(url, { headers: HEADERS });
        if (!response.ok) {
          console.error("Supabase list failed", response.status);
          return null;
        }
        const rows = await response.json();
        return { keys: rows.map((r) => r.key), prefix, shared: true };
      } catch (err) {
        console.error("Supabase list error", err);
        return null;
      }
    },
  };
})();
