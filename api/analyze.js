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
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: mimeType || 'image/jpeg', data: image } }, { text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 512 }})
    });
    const data = await response.json();
    if (data.error) return new Response(JSON.stringify({ error: data.error.message }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return new Response(JSON.stringify(parsed), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
  }
}
