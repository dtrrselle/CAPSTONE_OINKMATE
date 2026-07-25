// ============================================================
// File location: src/services/educationalService.ts
//
// I-import ito sa EducationalAdmin.tsx para gamitin
// ang real PHP API instead ng mock data.
// ============================================================

export type ContentCategory =
  | "Feeding Guide"
  | "Sanitation Guide"
  | "Pig Health"
  | "Disease Prevention"
  | "Farm Management"
  | "Advisory";

export type ContentStatus = "Published" | "Draft";

export interface EducationalContent {
  id: number;
  title: string;
  category: ContentCategory;
  author: string;
  description: string;
  body: string;
  source_url: string | null;
  source_label: string | null;
  status: ContentStatus;
  image_path: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentStats {
  total: string;
  published: string;
  draft: string;
  categories: string;
}

// ── Base URL — i-update kung kailangan ──────────────────────
const BASE_URL = "http://localhost/oinkmate-api/api/educational_contents.php";
const UPLOAD_URL = "http://localhost/oinkmate-api/uploads";

// ============================================================
// API Service
// ============================================================

export const educationalService = {

  // GET all — may search at filter params
  async list(params?: {
    search?: string;
    category?: string;
    status?: string;
  }): Promise<{ data: EducationalContent[]; stats: ContentStats }> {
    const url = new URL(BASE_URL);
    if (params?.search)   url.searchParams.set("search",   params.search);
    if (params?.category && params.category !== "All") {
      url.searchParams.set("category", params.category);
    }
    if (params?.status && params.status !== "All") {
      url.searchParams.set("status", params.status);
    }

    const res = await fetch(url.toString());
    const json = await res.json();

    if (!json.success) throw new Error(json.message);
    return { data: json.data, stats: json.stats };
  },

  // GET single item by ID
  async get(id: number): Promise<EducationalContent> {
    const res = await fetch(`${BASE_URL}?id=${id}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data;
  },

  // POST — create new content (supports image upload)
  async create(data: {
    title: string;
    category: ContentCategory;
    author: string;
    description: string;
    body: string;
    source_url?: string;
    source_label?: string;
    status: ContentStatus;
    image?: File | null;
  }): Promise<EducationalContent> {
    const form = new FormData();
    form.append("title",       data.title);
    form.append("category",    data.category);
    form.append("author",      data.author);
    form.append("description", data.description);
    form.append("body",        data.body);
    form.append("status",      data.status);
    if (data.source_url)   form.append("source_url",   data.source_url);
    if (data.source_label) form.append("source_label", data.source_label);
    if (data.image)        form.append("image",        data.image);

    const res = await fetch(BASE_URL, { method: "POST", body: form });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data;
  },

  // PUT — update existing content
  async update(id: number, data: {
    title: string;
    category: ContentCategory;
    author: string;
    description: string;
    body: string;
    source_url?: string;
    source_label?: string;
    status: ContentStatus;
    image?: File | null;
  }): Promise<EducationalContent> {
    const form = new FormData();
    form.append("title",       data.title);
    form.append("category",    data.category);
    form.append("author",      data.author);
    form.append("description", data.description);
    form.append("body",        data.body);
    form.append("status",      data.status);
    if (data.source_url)   form.append("source_url",   data.source_url);
    if (data.source_label) form.append("source_label", data.source_label);
    if (data.image)        form.append("image",        data.image);

    const res = await fetch(`${BASE_URL}?id=${id}`, { method: "PUT", body: form });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data;
  },

  // DELETE — soft delete
  async delete(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
  },

  // Helper: get full image URL from image_path stored in DB
  imageUrl(imagePath: string | null): string | null {
    if (!imagePath) return null;
    return `${UPLOAD_URL}/${imagePath}`;
  },
};