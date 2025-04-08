# get-enrich-api

A Vercel-based enrichment API powering cold-email dealership campaigns in the ShowRevv Lead Processing Tools.

---

## Purpose + Architecture

This API provides precision-cleaning and enrichment for dealership lead data, optimizing cold outreach campaigns. It supports domain-to-name cleaning, title/location normalization, and franchise group assignment, integrating seamlessly with Google Apps Script via the ShowRevv Lead Processing Tools.

Google Sheets (batchCleanCompanyNames.gs)
   /api/batch-enrich (v4.1.5)              Cleans company names
   /api/batch-enrich-company-name-fallback (v1.0.16) Fallback cleaning
   /api/batch-clean-titles-and-locations   Normalizes Job Title, City, State
   /api/batch-enrich-franchise (v1.0.0)    Assigns Franchise Group

---

## Endpoints

/batch-clean-titles-and-locations endpoint: Cleans Job Title, City, and State fields. Method is POST. Payload example: [{ "title": "gen. manager", "city": "los angeles ca", "state": "california", "rowNum": 1 }, ...]. Response example: { "results": [{ "title": "General Manager", "city": "Los Angeles", "state": "CA", "rowNum": 1 }], "partial": false }. Notes: Batch size of 5, 18s timeout.

/batch-enrich (v4.1.5) endpoint: Cleans company names from dealership domains, with flexible ordering for [CarBrand]of[City] patterns based on possessive-friendliness (e.g., "toyotaofslidell.net" → "Slidell Toyota"). Method is POST. Payload example: [{ "domain": "smithtowntoyota.com", "rowNum": 1 }, ...]. Response example: { "successful": [{ "domain": "smithtowntoyota.com", "companyName": "Smithtown Toyota", "confidenceScore": 100, "flags": ["OverrideApplied"], "rowNum": 1, "tokens": 0 }], "manualReviewQueue": [], "totalTokens": 0, "fallbackTriggers": [], "partial": false }. Notes: Batch size of 5, 18s timeout, normalizes subdomains (e.g., "mydealer-mbofstockton.com" → "mbofstockton").

/batch-enrich-company-name-fallback (v1.0.16) endpoint: Fallback for company name cleaning when /batch-enrich fails, with flexible ordering for [CarBrand]of[City] patterns. Method is POST. Payload is same as /batch-enrich. Response example: { "successful": [{ "domain": "smithtowntoyota.com", "companyName": "Smithtown Toyota", "confidenceScore": 100, "flags": ["OverrideApplied", "FallbackAPIUsed"], "rowNum": 1, "tokens": 0 }], "manualReviewQueue": [], "totalTokens": 0, "fallbackTriggers": [], "partial": false }. Notes: Batch size of 5, 18s timeout, normalizes subdomains.

/batch-enrich-franchise (v1.0.0) endpoint: Assigns Franchise Groups (e.g., Toyota, Ford). Method is POST. Payload example: [{ "domain": "smithtowntoyota.com", "humanName": "Smithtown Toyota", "rowNum": 1 }, ...]. Response example: { "results": [{ "franchiseGroup": "Toyota", "flags": ["Success"], "rowNum": 1 }], "manualReviewQueue": [], "partial": false }. Notes: Batch size of 5, 18s timeout.

---

## Scoring + Acceptance Rules

Accepted Names: ConfidenceScore is 75 or higher, has 2 or more words (unless override), no flags like TooGeneric, CityNameOnly, PossibleAbbreviation, Skipped, FallbackFailed. Rejected Names: Score below 75 or flagged are added to manualReviewQueue or discarded. Overrides: KNOWN_OVERRIDES (e.g., duvalford.com becomes Duval) always score 100. Cleanup: Trailing brands stripped unless part of a valid phrase (e.g., Devine Ford becomes Devine Auto). Ordering: For [CarBrand]of[City] patterns, the name is ordered to prioritize possessive-friendliness (e.g., "toyotaofslidell.net" → "Slidell Toyota" because "Slidell's" is more natural than "Toyota's"), with a PossessiveOrderAdjusted flag when reversed.

---

## Setup

1. Clone & Install:
   git clone https://github.com/cdearman90/get-enrich-api.git
   cd get-enrich-api
   No external npm dependencies, but requires internal ./lib/humanize.js.

2. Set Environment Variables:
   In Vercel, go to Settings, then Environment Variables:
   OPENAI_API_KEY: Your OpenAI API key (used via humanize.js).

3. Deploy:
   vercel deploy --prod

---

## Usage

Designed for automated enrichment in Google Apps Script, processing batches of 5. Test manually:
curl -X POST https://get-enrich-api-git-main-show-revv.vercel.app/api/batch-enrich -H "Content-Type: application/json" -d '[{ "domain": "smithtowntoyota.com", "rowNum": 1 }]'

---

## System Versioning

Script humanize.js: Version v1.0.0, Updated 2025-04-09
Script batch-enrich.js: Version v4.1.5, Updated 2025-04-09
Script batch-enrich-company-name-fallback.js: Version v1.0.16, Updated 2025-04-08
Script batch-enrich-franchise.js: Version v1.0.0, Updated 2025-04-07

---

## Development

Run Locally: vercel dev
Node.js Version: The project uses Node.js 22.x (specified in package.json).
Logging: Detailed error traces, processing steps, and enhanced fallbackTriggers logging (including brand, city, gptUsed) for transparency.
Notes:
   Uses ESM ("type": "module" in package.json)
   OPENAI_API_KEY enables GPT-4-turbo via humanize.js for /api/batch-enrich

---

## Notes
- Optimized for cold-email-safe output (1–3 words, no trailing brands, possessive-friendly ordering)
- 18s timeout ensures partial results under Vercel paid tier limits
- Integrates with Google Apps Script for dealership-specific outreach
- Normalizes subdomains (e.g., "mydealer-mbofstockton.com" → "mbofstockton") for consistent processing
