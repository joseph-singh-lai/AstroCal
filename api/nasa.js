// Vercel serverless proxy for NASA APOD and DONKI (keeps API key server-side)
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.NASA_API_KEY;
    if (!apiKey) {
        return res.status(500).json({
            error: 'NASA_API_KEY not configured',
            hint: 'Set NASA_API_KEY in Vercel project environment variables'
        });
    }

    const { path, ...rest } = req.query;
    if (!path || typeof path !== 'string') {
        return res.status(400).json({ error: 'Missing path query parameter' });
    }

    const allowedPrefixes = ['planetary/apod', 'DONKI/FLR', 'DONKI/CME'];
    if (!allowedPrefixes.some((p) => path.startsWith(p))) {
        return res.status(400).json({ error: 'Unsupported NASA API path' });
    }

    try {
        const params = new URLSearchParams({ api_key: apiKey });
        Object.entries(rest).forEach(([key, value]) => {
            if (value != null && key !== 'path') {
                params.set(key, String(value));
            }
        });

        const nasaUrl = `https://api.nasa.gov/${path}?${params.toString()}`;
        const response = await fetch(nasaUrl, {
            headers: {
                'User-Agent': 'AstroCalTT/1.0',
                'Referer': 'https://astrocal.vercel.app/'
            }
        });

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            return res.status(response.status).json({
                error: `NASA API error: ${response.statusText}`,
                details: body.substring(0, 200)
            });
        }

        const data = await response.json();

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        return res.status(200).json(data);
    } catch (error) {
        console.error('NASA proxy error:', error);
        return res.status(500).json({ error: 'Failed to fetch NASA data' });
    }
}
