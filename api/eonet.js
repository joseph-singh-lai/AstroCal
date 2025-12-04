// Vercel serverless function to proxy NASA EONET API and bypass CORS
export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get query parameters
    const { days = '30', api_key } = req.query;

    if (!api_key) {
        return res.status(400).json({ error: 'Missing api_key parameter' });
    }

    try {
        // Build EONET API URL
        const eonetUrl = `https://api.nasa.gov/EONET/events?days=${days}&api_key=${api_key}`;
        
        console.log('Proxy fetching EONET data from:', eonetUrl.replace(api_key, 'API_KEY_HIDDEN'));

        // Fetch from NASA EONET API
        const response = await fetch(eonetUrl, {
            headers: {
                'User-Agent': 'AstroCal/1.0',
                'Referer': 'https://astrocal.vercel.app/'
            }
        });
        
        console.log('EONET proxy response status:', response.status, response.statusText);

        if (!response.ok) {
            console.error(`EONET API fetch failed: ${response.status} ${response.statusText}`);
            return res.status(response.status).json({ 
                error: `Failed to fetch EONET data: ${response.statusText}` 
            });
        }

        // Get the JSON data
        const data = await response.json();
        
        console.log(`EONET data fetched successfully: ${data.events ? data.events.length : 0} events`);

        // Set CORS headers to allow the frontend to use the data
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=43200'); // Cache for 12 hours

        // Return the data
        return res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching EONET data:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

