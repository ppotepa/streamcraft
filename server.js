const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 8080;

// Serve static files
app.use(express.static(__dirname));

// Proxy endpoint for SC2 Pulse API
app.get('/api/proxy', async (req, res) => {
    try {
        // Rebuild query string from req.query
        const queryParams = new URLSearchParams();
        for (const [key, value] of Object.entries(req.query)) {
            if (Array.isArray(value)) {
                value.forEach(v => queryParams.append(key, v));
            } else {
                queryParams.append(key, value);
            }
        }

        const apiUrl = `https://sc2pulse.nephest.com/sc2/api/team-histories?${queryParams.toString()}`;
        console.log('Proxying request to:', apiUrl);

        const response = await fetch(apiUrl);
        const data = await response.json();

        res.json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Proxy endpoint for ISS position
app.get('/api/iss-position', async (req, res) => {
    try {
        const apiUrl = 'http://api.open-notify.org/iss-now.json';
        console.log('Proxying ISS position request');

        const response = await fetch(apiUrl);
        const data = await response.json();

        res.json(data);
    } catch (error) {
        console.error('ISS position proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Proxy endpoint for ISS crew
app.get('/api/iss-crew', async (req, res) => {
    try {
        const apiUrl = 'http://api.open-notify.org/astros.json';
        console.log('Proxying ISS crew request');

        const response = await fetch(apiUrl);
        const data = await response.json();

        res.json(data);
    } catch (error) {
        console.error('ISS crew proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Proxy endpoint for reverse geocoding
app.get('/api/reverse-geocode', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        const apiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=5&accept-language=en`;
        console.log('Proxying reverse geocode request');

        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'ISS-Tracker/1.0'
            }
        });
        const data = await response.json();

        res.json(data);
    } catch (error) {
        console.error('Reverse geocode proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log(`📊 Chart: http://localhost:${PORT}/chart.html`);
    console.log(`🛰️  ISS Tracker: http://localhost:${PORT}/experiments/iss-tracker.html\n`);
});
