import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-df04cfb8/health", (c) => {
  return c.json({ status: "ok" });
});

app.get("/make-server-df04cfb8/clerk/status", async (c) => {
  const secretKey = Deno.env.get("CLERK_SECRET_KEY");
  if (!secretKey) return c.json({ configured: false, error: "CLERK_SECRET_KEY belum tersedia di server." }, 503);

  const response = await fetch("https://api.clerk.com/v1/instance", {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  if (!response.ok) return c.json({ configured: false, error: "CLERK_SECRET_KEY ditolak Clerk." }, 502);
  const instance = await response.json();
  return c.json({ configured: true, instanceId: instance.id, environment: instance.environmentType });
});

type Voucher = {
  id: string;
  name: string;
  type: "percent" | "nominal";
  value: number;
  minimum: number;
  expiresAt: string;
  active: boolean;
  createdAt: string;
};

const vouchersKey = "bycashier:vouchers";
const bannersKey = "bycashier:banners";
const messagesKey = "bycashier:messages";
const productsKey = "bycashier:products";
const categoriesKey = "bycashier:categories";
const notificationsKey = "bycashier:notifications";
const staffKey = "bycashier:staff";
const settingsKey = "bycashier:store-settings";
const transactionsKey = "bycashier:transactions";
const cctvOutletsKey = "bycashier:cctv-outlets";
const cctvCamerasKey = "bycashier:cctv-cameras";
const cctvEventsKey = "bycashier:cctv-events";
const operationsKey = "bycashier:operations";

const defaultSettings = { storeName: "BY.CASHIER UMKM", address: "Jakarta Selatan", logo: "", taxRate: 11, receiptFooter: "Terima kasih sudah berbelanja.", paymentMethods: { CASH: true, QRIS: true, Online: true, EDC: true, Split: true }, menuFilters: { bestseller: true, discount: true, popular: true } };
const digestPin = async (pin: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin)))).map(byte => byte.toString(16).padStart(2, "0")).join("");
const publicStaff = ({ pinHash, ...staff }: Record<string, unknown>) => staff;

app.get("/make-server-df04cfb8/vouchers", async (c) => {
  const vouchers = await kv.get(vouchersKey) ?? [];
  return c.json({ vouchers });
});

app.post("/make-server-df04cfb8/vouchers", async (c) => {
  const payload = await c.req.json<Voucher>();
  if (!payload.name || !payload.value || payload.minimum < 0 || !payload.expiresAt) {
    return c.json({ error: "Data voucher belum lengkap." }, 400);
  }
  const vouchers: Voucher[] = await kv.get(vouchersKey) ?? [];
  const voucher: Voucher = { ...payload, id: crypto.randomUUID(), active: true, createdAt: new Date().toISOString() };
  await kv.set(vouchersKey, [voucher, ...vouchers]);
  return c.json({ voucher }, 201);
});

app.get("/make-server-df04cfb8/banners", async (c) => {
  const banners = await kv.get(bannersKey) ?? [];
  return c.json({ banners });
});

app.post("/make-server-df04cfb8/banners", async (c) => {
  const payload = await c.req.json<{ image: string; caption: string; title: string }>();
  if (!payload.image || !payload.caption) return c.json({ error: "Gambar dan caption wajib diisi." }, 400);
  const banners = await kv.get(bannersKey) ?? [];
  if (banners.length >= 4) return c.json({ error: "Maksimal empat slide spanduk." }, 400);
  const banner = { id: crypto.randomUUID(), ...payload, createdAt: new Date().toISOString() };
  await kv.set(bannersKey, [...banners, banner]);
  return c.json({ banner }, 201);
});

app.delete("/make-server-df04cfb8/banners/:id", async (c) => {
  const banners = await kv.get(bannersKey) ?? [];
  const next = banners.filter((banner: { id: string }) => banner.id !== c.req.param("id"));
  await kv.set(bannersKey, next);
  return c.json({ banners: next });
});

app.get("/make-server-df04cfb8/messages", async (c) => {
  const messages = await kv.get(messagesKey) ?? [];
  return c.json({ messages });
});

app.post("/make-server-df04cfb8/messages", async (c) => {
  const payload = await c.req.json<{ body: string; sender: "admin" | "cashier" | "supervisor"; senderId?: string; senderName?: string; senderPhoto?: string; audioUrl?: string; audioDuration?: number }>();
  if (!payload.body?.trim() && !payload.audioUrl) return c.json({ error: "Pesan atau voice note wajib diisi." }, 400);
  const messages = await kv.get(messagesKey) ?? [];
  const message = { id: crypto.randomUUID(), body: payload.body?.trim() || "", sender: payload.sender, senderId: payload.senderId, senderName: payload.senderName, senderPhoto: payload.senderPhoto, audioUrl: payload.audioUrl, audioDuration: payload.audioDuration, createdAt: new Date().toISOString() };
  await kv.set(messagesKey, [...messages, message]);
  return c.json({ message }, 201);
});

app.get("/make-server-df04cfb8/products", async (c) => {
  const products = await kv.get(productsKey) ?? [];
  return c.json({ products });
});

app.put("/make-server-df04cfb8/products", async (c) => {
  const products = await c.req.json<any[]>();
  if (!Array.isArray(products)) return c.json({ error: "Format produk tidak valid." }, 400);
  await kv.set(productsKey, products);
  return c.json({ products });
});

app.get("/make-server-df04cfb8/categories", async (c) => {
  return c.json({ categories: await kv.get(categoriesKey) ?? [] });
});

app.put("/make-server-df04cfb8/categories", async (c) => {
  const categories = await c.req.json<{ id: string; name: string; icon: string; productIds: number[] }[]>();
  if (!Array.isArray(categories) || !categories.some(category => category.id === "all")) return c.json({ error: "Kategori Semua wajib tersedia." }, 400);
  if (categories.some(category => !category.id || !category.name?.trim() || !Array.isArray(category.productIds))) return c.json({ error: "Format kategori tidak valid." }, 400);
  await kv.set(categoriesKey, categories);
  return c.json({ categories });
});

app.get("/make-server-df04cfb8/notifications", async (c) => {
  const notifications = await kv.get(notificationsKey) ?? [];
  return c.json({ notifications });
});

app.get("/make-server-df04cfb8/staff", async (c) => {
  const staff = await kv.get<Record<string, unknown>[]>(staffKey) ?? [];
  return c.json({ staff: staff.map(publicStaff) });
});

app.post("/make-server-df04cfb8/staff", async (c) => {
  const draft = await c.req.json<{ name: string; pin: string; role: string; shift: string; hourlyRate: number; permissions: string[] }>();
  if (!draft.name?.trim() || !/^\d{4,8}$/.test(draft.pin || "")) return c.json({ error: "Nama dan PIN 4–8 angka wajib diisi." }, 400);
  const staff = await kv.get<Record<string, unknown>[]>(staffKey) ?? [];
  const item = { id: crypto.randomUUID(), name: draft.name.trim(), role: draft.role || "Kasir", shift: draft.shift || "Pagi · 08.00–16.00", hourlyRate: Number(draft.hourlyRate) || 0, permissions: draft.permissions || [], attendance: "Belum check-in", pinHash: await digestPin(draft.pin) };
  await kv.set(staffKey, [item, ...staff]);
  return c.json({ staff: publicStaff(item) }, 201);
});

app.post("/make-server-df04cfb8/staff/login", async (c) => {
  const { name, pin } = await c.req.json<{ name: string; pin: string }>();
  const staff = await kv.get<Record<string, unknown>[]>(staffKey) ?? [];
  const pinHash = await digestPin(pin || "");
  const found = staff.find(item => String(item.name).toLowerCase() === String(name).trim().toLowerCase() && item.pinHash === pinHash);
  if (!found) return c.json({ error: "Nama atau PIN tidak cocok." }, 401);
  return c.json({ staff: publicStaff(found) });
});

app.post("/make-server-df04cfb8/staff/:id/attendance", async (c) => {
  const { attendance } = await c.req.json<{ attendance: "Hadir" | "Belum check-in" | "Selesai shift" }>();
  const staff = await kv.get<Record<string, unknown>[]>(staffKey) ?? [];
  const next = staff.map(item => item.id === c.req.param("id") ? { ...item, attendance, lastAttendanceAt: new Date().toISOString() } : item);
  await kv.set(staffKey, next);
  const updated = next.find(item => item.id === c.req.param("id"));
  return c.json({ staff: updated ? publicStaff(updated) : null });
});

app.put("/make-server-df04cfb8/staff/:id", async (c) => {
  const { role, permissions, shift, hourlyRate } = await c.req.json<{ role?: string; permissions?: string[]; shift?: string; hourlyRate?: number }>();
  const staff = await kv.get<Record<string, unknown>[]>(staffKey) ?? [];
  const next = staff.map(item => item.id === c.req.param("id") ? { ...item, ...(role ? { role } : {}), ...(Array.isArray(permissions) ? { permissions } : {}), ...(shift ? { shift } : {}), ...(typeof hourlyRate === "number" ? { hourlyRate } : {}) } : item);
  await kv.set(staffKey, next);
  const updated = next.find(item => item.id === c.req.param("id"));
  return c.json({ staff: updated ? publicStaff(updated) : null });
});

app.delete("/make-server-df04cfb8/staff/:id", async (c) => {
  const staff = await kv.get<Record<string, unknown>[]>(staffKey) ?? [];
  const next = staff.filter(item => item.id !== c.req.param("id"));
  await kv.set(staffKey, next);
  return c.json({ staff: next.map(publicStaff) });
});

app.put("/make-server-df04cfb8/staff/:id/profile", async (c) => {
  const { name, photo } = await c.req.json<{ name?: string; photo?: string }>();
  const staff = await kv.get<Record<string, unknown>[]>(staffKey) ?? [];
  const next = staff.map(item => item.id === c.req.param("id") ? { ...item, name: name?.trim() || item.name, photo: typeof photo === "string" ? photo : item.photo } : item);
  await kv.set(staffKey, next);
  const updated = next.find(item => item.id === c.req.param("id"));
  return c.json({ staff: updated ? publicStaff(updated) : null });
});

app.get("/make-server-df04cfb8/store-settings", async (c) => {
  const saved = await kv.get(settingsKey);
  return c.json({ settings: saved ? { ...defaultSettings, ...saved, paymentMethods: { ...defaultSettings.paymentMethods, ...saved.paymentMethods }, menuFilters: { ...defaultSettings.menuFilters, ...saved.menuFilters } } : defaultSettings });
});

app.put("/make-server-df04cfb8/store-settings", async (c) => {
  const settings = await c.req.json();
  if (!settings?.storeName?.trim()) return c.json({ error: "Nama toko wajib diisi." }, 400);
  const next = { ...defaultSettings, ...settings, paymentMethods: { ...defaultSettings.paymentMethods, ...settings.paymentMethods }, menuFilters: { ...defaultSettings.menuFilters, ...settings.menuFilters } };
  await kv.set(settingsKey, next);
  return c.json({ settings: next });
});

app.get("/make-server-df04cfb8/transactions", async (c) => {
  return c.json({ transactions: await kv.get(transactionsKey) ?? [] });
});

app.post("/make-server-df04cfb8/transactions", async (c) => {
  const draft = await c.req.json();
  if (!draft?.total || !Array.isArray(draft.items) || !draft.items.length) return c.json({ error: "Data transaksi tidak lengkap." }, 400);
  const transactions = await kv.get<any[]>(transactionsKey) ?? [];
  const transaction = { ...draft, id: crypto.randomUUID(), invoice: `INV-${Date.now().toString().slice(-8)}`, status: "Completed", createdAt: new Date().toISOString() };
  await kv.set(transactionsKey, [transaction, ...transactions]);
  return c.json({ transaction }, 201);
});

app.post("/make-server-df04cfb8/broadcast", async (c) => {
  const { body, recipients } = await c.req.json<{ body: string; recipients: string[] }>();
  if (!body?.trim()) return c.json({ error: "Isi broadcast tidak boleh kosong." }, 400);
  const notifications = await kv.get(notificationsKey) ?? [];
  const notification = { id: crypto.randomUUID(), body: body.trim(), createdAt: new Date().toISOString(), read: false };
  await kv.set(notificationsKey, [notification, ...notifications]);
  return c.json({ notification });
});

app.get("/make-server-df04cfb8/cctv/outlets", async (c) => c.json({ outlets: await kv.get(cctvOutletsKey) ?? [] }));
app.get("/make-server-df04cfb8/cctv/cameras", async (c) => c.json({ cameras: await kv.get(cctvCamerasKey) ?? [] }));
app.get("/make-server-df04cfb8/cctv/events", async (c) => c.json({ events: await kv.get(cctvEventsKey) ?? [] }));
app.post("/make-server-df04cfb8/cctv/sync", async (c) => {
  const cameras = await kv.get<any[]>(cctvCamerasKey) ?? [];
  return c.json({ checked: cameras.length, failed: cameras.filter(camera => camera.status !== "online").length });
});
app.post("/make-server-df04cfb8/cctv/cameras/:id/reset", async (c) => {
  return c.json({ error: "Media gateway RTSP/ONVIF belum dikonfigurasi. Reset koneksi tidak dapat dijalankan." }, 503);
});
app.post("/make-server-df04cfb8/cctv/cameras", async (c) => {
  const draft = await c.req.json<{ outletId: string; name: string; protocol: string; streamUrl: string; username: string; port: string }>();
  if (!draft.outletId || !draft.name?.trim() || !draft.streamUrl?.trim()) return c.json({ error: "Outlet, nama kamera, dan Stream URL wajib diisi." }, 400);
  return c.json({ error: "Media gateway RTSP/ONVIF belum dikonfigurasi. Koneksi stream tidak dapat diuji atau disimpan dengan aman." }, 503);
});

app.post("/make-server-df04cfb8/operations", async (c) => {
  const draft = await c.req.json<{ type: "closing" | "reports" | "settlement"; note?: string; total: number; transactionIds: string[]; staffId?: string; staffName?: string }>();
  if (!draft?.type || !Array.isArray(draft.transactionIds) || !draft.transactionIds.length || typeof draft.total !== "number") return c.json({ error: "Data operasional belum lengkap." }, 400);
  const records = await kv.get<any[]>(operationsKey) ?? [];
  const record = { ...draft, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  await kv.set(operationsKey, [record, ...records]);
  return c.json({ record }, 201);
});

Deno.serve(app.fetch);
