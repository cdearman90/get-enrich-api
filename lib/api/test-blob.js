import { put, get } from "@vercel/blob";

export default async function handler(req, res) {
  try {
    console.log("Testing Blob Storage: Saving test data");
    const blob = await put("test/test.json", new Blob([JSON.stringify({ test: "data" })], { type: "application/json" }), { access: "public" });
    console.log("Testing Blob Storage: Saved test data, URL:", blob.url);

    console.log("Testing Blob Storage: Loading test data");
    const data = await get("test/test.json");
    const text = await data.text();
    console.log("Testing Blob Storage: Loaded test data:", text);

    return res.status(200).json({ url: blob.url, data: JSON.parse(text) });
  } catch (err) {
    console.error("Testing Blob Storage: Failed:", err.message);
    return res.status(500).json({ error: "Blob storage test failed", details: err.message });
  }
}
