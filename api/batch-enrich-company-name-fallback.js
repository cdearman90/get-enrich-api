export default async function handler(req, res) {
  try {
    return res.status(200).json({
      results: req.body.map(lead => ({
        name: "Fallback " + lead.domain.split(".")[0],
        confidenceScore: 85,
        flags: ["FallbackUsed"],
        rowNum: lead.rowNum
      })),
      manualReviewQueue: [],
      totalTokens: 37,
      partial: false
    });
  } catch (err) {
    console.error(`Fallback endpoint error: ${err.message}`);
    return res.status(500).json({ error: "Fallback endpoint failed", details: err.message });
  }
}
