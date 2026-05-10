export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }});
  }
  try {
    const body = await req.text();
    const { image, mimeType } = JSON.parse(body);
    if (!image) return new Response(JSON.stringify({ error: 'No image provided' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
    const prompt = `Analiza esta etiqueta de producto para sistema WMS Blue Yonder. Extrae exactamente:\n1. LOTE: campo LOT/LOTE/BATCH/L: - extrae todos los dígitos numéricos\n2. FECHA VENCIMIENTO: campo VEN/EXP/BB/VENCE - conviértela a YYYYMMDD\n\nResponde SOLO este JSON sin texto extra:\n{"lote_digitos":"solo dígitos del lote","fecha_YYYYMMDD":"fecha en YYYYMMDD 8 dígitos exactos","fecha_raw":"texto original de la fecha","producto":"nombre producto","confianza_lote":0,"confianza_fecha":0}\n\nSi no encuentras usa null. NO inventes.`;
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: image }},
            { type: 'text', text: prompt }
          ]
        }]
      })
    });
    const data = await anthropicRes.json();
    if (data.error) return new Response(JSON.stringify({ error: 'Anthropic: ' + data.error.message }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
    const raw = data.content?.[0]?.text || '';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return new Response(JSON.stringify(parsed), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server: ' + err.message }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
  }
}
