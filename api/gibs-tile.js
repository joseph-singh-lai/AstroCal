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

        // Validate that it's an allowed tile URL (security check)
        const allowedDomains = [
            'earthdata.nasa.gov',
            'vis.earthdata.nasa.gov',
            'nowcoast.noaa.gov',
            'gibs.earthdata.nasa.gov'
        ];
        
        const isAllowed = allowedDomains.some(domain => tileUrl.includes(domain));
        if (!isAllowed) {
            return res.status(400).json({ error: 'Invalid tile URL - domain not allowed' });
        }

        // Fetch the tile from NOAA/NASA
        console.log('Proxy fetching tile from:', tileUrl);
        const response = await fetch(tileUrl, {
            headers: {
                'User-Agent': 'AstroCalTT/1.0',
                'Referer': 'https://astrocal.vercel.app/'
            }
        });
        
        console.log('Proxy response status:', response.status, response.statusText);
        console.log('Proxy response Content-Type:', response.headers.get('content-type'));
        console.log('Proxy response Content-Length:', response.headers.get('content-length'));

        if (!response.ok) {
            console.error(`NOAA tile fetch failed: ${response.status} ${response.statusText} for URL: ${tileUrl}`);
            // Return a transparent 1x1 PNG instead of JSON so Leaflet can display it
            // This prevents the error placeholder from showing
            const transparentPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'no-cache');
            return res.status(200).send(transparentPixel);
        }

        // Get the response data
        const responseBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';
        
        // Check if we got actual image data (not empty or error)
        if (responseBuffer.byteLength === 0) {
            console.error('NOAA returned empty response for URL:', tileUrl);
            const transparentPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'no-cache');
            return res.status(200).send(transparentPixel);
        }
        
        // Check if response is actually an image (not HTML/JSON error page)
        const isImage = contentType.startsWith('image/');
        if (!isImage) {
            console.error(`NOAA returned non-image content: ${contentType} for URL:`, tileUrl);
            console.error('Response preview (first 200 chars):', Buffer.from(responseBuffer).toString('utf-8').substring(0, 200));
            const transparentPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'no-cache');
            return res.status(200).send(transparentPixel);
        }
        
        // Log image size for debugging
        console.log(`NOAA tile fetched successfully: ${responseBuffer.byteLength} bytes, Content-Type: ${contentType}`);

        // Set CORS headers to allow the frontend to use the image
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

        // Return the image
        return res.status(200).send(Buffer.from(responseBuffer));
    } catch (error) {
        console.error('Error fetching tile:', error);
        console.error('Failed URL:', tileUrl);
        // Return a transparent 1x1 PNG instead of JSON so Leaflet can display it
        const transparentPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache');
        return res.status(200).send(transparentPixel);
    }
}

