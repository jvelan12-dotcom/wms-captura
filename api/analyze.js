export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { image, mimeType } = req.body;
    const prompt = `Analiza esta etiqueta de producto para sistema WMS Blue Yonder. Extrae exactamente:\n1. LOTE: campo LOT/LOTE/BATCH/L: - extrae todos los dígitos numéricos\n2. FECHA VENCIMIENTO: campo VEN/EXP/BB/VENCE - conviértela a YYYYMMDD\n\nResponde SOLO este JSON sin texto extra:\n{"lote_digitos":"solo dígitos del lote","fecha_YYYYMMDD":"fecha en YYYYMMDD 8 dígitos exactos","fecha_raw":"texto original de la fecha","producto":"nombre producto","confianza_lote":0,"confianza_fecha":0}\n\nSi no encuentras usa null. NO inventes.`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: image } }, { text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
      })
    });
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
