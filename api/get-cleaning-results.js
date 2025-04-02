import { loadFromBlob } from "../lib/blob";

export default async function handler(req, res) {
  const { batchId } = req.query;
  if (!batchId) return res.status(400).json({ error: "Missing batchId" });

  try {
    const { results } = await loadFromBlob(`results/${batchId}.json`);
    return res.status(200).json({ results });
  } catch (err) {
    return res.status(404).json({ error: "Results not found", details: err.message });
  }
}
