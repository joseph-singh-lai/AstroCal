// Vercel serverless function to proxy GIBS tiles and bypass CORS
export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get the tile URL from query parameters
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        // Decode the URL
        const tileUrl = decodeURIComponent(url);

        // Validate that it's a GIBS URL (security check)
        if (!tileUrl.includes('earthdata.nasa.gov') && !tileUrl.includes('vis.earthdata.nasa.gov')) {
            return res.status(400).json({ error: 'Invalid tile URL' });
        }

        // Fetch the tile from GIBS
        const response = await fetch(tileUrl, {
            headers: {
                'User-Agent': 'AstroCal/1.0',
                'Referer': 'https://astrocal.vercel.app/'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ 
                error: `Failed to fetch tile: ${response.statusText}` 
            });
        }

        // Get the image data
        const imageBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Set CORS headers to allow the frontend to use the image
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

        // Return the image
        return res.status(200).send(Buffer.from(imageBuffer));
    } catch (error) {
        console.error('Error fetching GIBS tile:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

