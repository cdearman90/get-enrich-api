import { saveToBlob } from "../lib/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { leads, batchId } = req.body;
  if (!Array.isArray(leads) || !batchId) {
    return res.status(400).json({ error: "Missing leads or batchId" });
  }

  try {
    await saveToBlob(`jobs/${batchId}.json`, { leads });
    return res.status(200).json({ status: "queued", batchId });
  } catch (err) {
    return res.status(500).json({ error: "Failed to queue batch", details: err.message });
  }
}
