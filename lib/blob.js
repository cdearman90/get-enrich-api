import { put, get } from "@vercel/blob";

export async function saveToBlob(path, data) {
  const json = JSON.stringify(data);
  const blob = await put(path, new Blob([json], { type: "application/json" }));
  return blob.url;
}

export async function loadFromBlob(path) {
  const res = await fetch(`https://blob.vercel-storage.com/${path}`);
  if (!res.ok) throw new Error(`Failed to load blob: ${path}`);
  return await res.json();
}
