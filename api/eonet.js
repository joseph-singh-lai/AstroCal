// Vercel serverless function to proxy NASA EONET API and bypass CORS
export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get query parameters
    // Note: New EONET API v3 doesn't require API key and uses different parameters
    // Documentation: https://eonet.gsfc.nasa.gov/how-to-guide
    const { limit = '100', status = 'open' } = req.query;

    try {
        // Build EONET API URL using the new v3 endpoint
        // New endpoint: https://eonet.gsfc.nasa.gov/api/v3/events
        // Parameters: status (open/closed/all), limit (number of events)
        const eonetUrl = `https://eonet.gsfc.nasa.gov/api/v3/events?status=${status}&limit=${limit}`;
        
        console.log('Proxy fetching EONET data from:', eonetUrl);

        // Fetch from NASA EONET API
        const response = await fetch(eonetUrl, {
            headers: {
                'User-Agent': 'AstroCal/1.0',
                'Referer': 'https://astrocal.vercel.app/'
            }
        });
        
        console.log('EONET proxy response status:', response.status, response.statusText);

        if (!response.ok) {
            // Try to get error details from response
            let errorDetails = '';
            try {
                const errorText = await response.text();
                errorDetails = errorText;
                console.error(`EONET API fetch failed: ${response.status} ${response.statusText}`);
                console.error('Error response body:', errorText.substring(0, 500));
            } catch (e) {
                console.error(`EONET API fetch failed: ${response.status} ${response.statusText} (could not read error body)`);
            }
            
            return res.status(response.status).json({ 
                error: `Failed to fetch EONET data: ${response.statusText}`,
                details: errorDetails.substring(0, 200),
                status: response.status
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

