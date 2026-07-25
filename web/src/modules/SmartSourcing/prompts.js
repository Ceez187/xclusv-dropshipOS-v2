// Shared JSON contract Claude is asked to fill in for both the URL/keyword
// and image-upload sourcing flows, so the UI can render one result shape.
const RESPONSE_SHAPE = `{
  "productName": string,
  "priceRangeLow": number,        // USD, low end of 1688/Taobao unit cost
  "priceRangeHigh": number,       // USD, high end of 1688/Taobao unit cost
  "suggestedRetail": number,      // USD suggested US retail price
  "marginPercent": number,        // approximate margin at suggested retail
  "suppliers": [ { "type": string, "moq": string, "notes": string } ],
  "searchKeywordZh": string,      // Chinese search keyword for 1688/Taobao
  "searchKeywordEn": string       // English keyword for reference
}`

export function buildTextSourcingMessages(input) {
  return [
    {
      role: 'user',
      content: `You are a sourcing assistant for a US dropshipper who buys from Chinese suppliers on 1688/Taobao and fulfills via a Basetao agent. Analyze this product: "${input}".\n\nRespond with ONLY JSON, no prose, no markdown fences, matching exactly this shape:\n${RESPONSE_SHAPE}`,
    },
  ]
}

export function buildImageSourcingMessages(base64Data, mediaType) {
  return [
    {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
        {
          type: 'text',
          text: `Identify this product and analyze it as a sourcing assistant for a US dropshipper who buys from Chinese suppliers on 1688/Taobao and fulfills via a Basetao agent.\n\nRespond with ONLY JSON, no prose, no markdown fences, matching exactly this shape:\n${RESPONSE_SHAPE}`,
        },
      ],
    },
  ]
}

export { parseClaudeJson as parseAnalysis } from '../../lib/parseClaudeJson'
