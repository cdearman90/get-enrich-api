# get-enrich-api

A Vercel API for enriching lead data in the ShowRevv Lead Processing Tools Google Apps Script project.

## Overview
This API provides endpoints for cleaning and enriching lead data, such as job titles, locations, company names, and franchise groups. It is used by the ShowRevv Lead Processing Tools script to process leads in batches, ensuring data quality for automotive dealership leads.

## Endpoints
- **`/api/batch-clean-titles-and-locations`**: Cleans Job Title, City, and State fields.
  - Method: POST
  - Payload: `[{ "title": "gen. manager", "city": "los angeles ca", "state": "california", "rowNum": 1 }, ...]`
  - Response: `{ "results": [{ "title": "General Manager", "city": "Los Angeles", "state": "CA", "rowNum": 1 }], ... }`
- **`/api/batch-enrich`**: Cleans company names.
  - Method: POST
  - Payload: `[{ "domain": "smithtowntoyota.com", "rowNum": 1 }, ...]`
  - Response: `{ "results": [{ "name": "Smithtown Toyota", "confidenceScore": 100, "flags": ["OverrideApplied"], "rowNum": 1 }], ... }`
- **`/api/batch-enrich-company-name-fallback`**: Fallback for company name cleaning when `/api/batch-enrich` fails.
  - Method: POST
  - Payload: `[{ "domain": "smithtowntoyota.com", "rowNum": 1 }, ...]`
  - Response: Similar to `/api/batch-enrich`.
- **`/api/batch-enrich-franchise`**: Assigns Franchise Group based on domain and company name.
  - Method: POST
  - Payload: `[{ "domain": "smithtowntoyota.com", "humanName": "Smithtown Toyota", "rowNum": 1 }, ...]`
  - Response: `{ "results": [{ "franchiseGroup": "Toyota", "flags": ["Success"], "rowNum": 1 }], ... }`

## Setup
1. **Clone the Repository**:
   \`\`\`bash
   git clone https://github.com/cdearman90/get-enrich-api.git
   cd get-enrich-api
   \`\`\`
2. **Install Dependencies**:
   - Currently, there are no external dependencies (\`"dependencies": {}\` in `package.json`).
   - If you add dependencies, run:
     \`\`\`bash
     npm install
     \`\`\`
3. **Set Environment Variables**:
   - Add the following environment variable in Vercel:
     - `OPENAI_API_KEY`: Your OpenAI API key (required for `/api/batch-enrich`).
   - In the Vercel dashboard, go to Settings > Environment Variables and add `OPENAI_API_KEY`.
4. **Deploy to Vercel**:
   \`\`\`bash
   vercel deploy --prod
   \`\`\`

## Usage
This API is designed to be called by the ShowRevv Lead Processing Tools Google Apps Script. The script uses the following endpoints:
- `/api/batch-clean-titles-and-locations` for cleaning Job Title, City, and State.
- `/api/batch-enrich` and `/api/batch-enrich-company-name-fallback` for cleaning company names.
- `/api/batch-enrich-franchise` for assigning Franchise Groups.

To test an endpoint manually:
\`\`\`bash
curl -X POST https://get-enrich-api-git-main-show-revv.vercel.app/api/batch-enrich \
  -H "Content-Type: application/json" \
  -d '[{ "domain": "smithtowntoyota.com", "rowNum": 1 }]'
\`\`\`

## Development
- **Local Development**: Use Vercel CLI to run the API locally:
  \`\`\`bash
  vercel dev
  \`\`\`
- **Node.js Version**: The project uses Node.js 18 or higher (specified in `package.json`).

## Notes
- Ensure the OpenAI API key is set in Vercel to enable company name cleaning.
- The API uses ESM syntax (`"type": "module"` in `package.json`), so all `.js` files must use `import`/`export` syntax.
