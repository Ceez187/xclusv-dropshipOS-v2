import type { ClaudeMessage } from '../../lib/api'

// Shared JSON contract Claude is asked to fill in for both the URL/keyword
// and image-upload sourcing flows, so the UI can render one result shape.
const RESPONSE_SHAPE = `{
  "productName": string,
  "priceRangeLow": number,        // USD, low end of 1688/Taobao unit cost
  "priceRangeHigh": number,       // USD, high end of 1688/Taobao unit cost
  "suggestedRetail": number,      // USD suggested US retail price
  "marginPercent": number,        // approximate margin at suggested retail
  "suppliers": [ { "type": string, "moq": string, "notes": string } ], // list 5-6 distinct supplier options, spanning 1688, Taobao, AliExpress, and a Basetao agent — include more than one option per channel where realistic (e.g. two different 1688 supplier profiles at different price/quality tiers). Prioritize suppliers with low or no MOQ (1 unit / no minimum) since this is for dropshipping with no upfront inventory — sort the list from lowest MOQ to highest, and note in "notes" when a supplier offers single-unit/no-MOQ ordering
  "searchKeywordZh": string,      // Chinese search keyword for 1688/Taobao
  "searchKeywordEn": string       // English keyword for reference
}`

export function buildTextSourcingMessages(input: string): ClaudeMessage[] {
  return [
    {
      role: 'user',
      content: `You are a sourcing assistant for a US dropshipper who buys from Chinese suppliers on 1688/Taobao and fulfills via a Basetao agent. This dropshipper holds no inventory, so low-MOQ or no-MOQ (single-unit) suppliers are strongly preferred over bulk-only suppliers. Analyze this product: "${input}".\n\nRespond with ONLY JSON, no prose, no markdown fences, matching exactly this shape:\n${RESPONSE_SHAPE}`,
    },
  ]
}

export function buildImageSourcingMessages(base64Data: string, mediaType: string, extraContext?: string): ClaudeMessage[] {
  return [
    {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
        {
          type: 'text',
          text: `Identify this product and analyze it as a sourcing assistant for a US dropshipper who buys from Chinese suppliers on 1688/Taobao and fulfills via a Basetao agent. This dropshipper holds no inventory, so low-MOQ or no-MOQ (single-unit) suppliers are strongly preferred over bulk-only suppliers.${
            extraContext?.trim() ? ` Additional context from the user: ${extraContext.trim()}.` : ''
          }\n\nRespond with ONLY JSON, no prose, no markdown fences, matching exactly this shape:\n${RESPONSE_SHAPE}`,
        },
      ],
    },
  ]
}

export { parseClaudeJson as parseAnalysis } from '../../lib/parseClaudeJson'
