import { onMount, onCleanup, createSignal } from 'solid-js';

function ISSTrackerScreen(props) {
    let mapContainer;
    let map;
    let issMarker = null;
    let issCircle = null;
    let trailPolyline = null;
    let predictedPolyline = null;
    let currentRotation = 0;
    const trailCoordinates = [];
    const maxTrailPoints = 100;

    const [crew, setCrew] = createSignal('Loading...');
    const [altitude] = createSignal('~408 km');
    const [location, setLocation] = createSignal('Loading...');
    const [status, setStatus] = createSignal({ online: true, text: '🟢 Live Tracking Active' });

    function createISSIcon(rotation = 0) {
        return L.divIcon({
            className: 'iss-marker',
            html: `<div style="font-size: 40px; text-shadow: 0 0 10px #00ff88; transform: rotate(${rotation}deg); display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">🛰️</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });
    }

    function calculatePredictedPath(currentLat, currentLon, trail) {
        const predictedPoints = [[currentLat, currentLon]];
        const numPredictions = 60;

        if (trail.length < 10) return predictedPoints;

        const orbitalInclination = 51.6;
        const recent = trail.slice(-10);

        let avgLonDelta = 0;
        for (let i = 1; i < recent.length; i++) {
            let lonDiff = recent[i][1] - recent[i - 1][1];
            if (lonDiff > 180) lonDiff -= 360;
            if (lonDiff < -180) lonDiff += 360;
            avgLonDelta += lonDiff;
        }
        avgLonDelta /= (recent.length - 1);

        let latDirection = 0;
        if (recent.length >= 3) {
            const recentLatChange = recent[recent.length - 1][0] - recent[recent.length - 3][0];
            latDirection = recentLatChange;
        }

        const currentPhase = Math.asin(currentLat / orbitalInclination);
        const periodInPoints = (90 * 60) / 10;
        const angularVelocity = (2 * Math.PI) / periodInPoints;

        let direction = latDirection >= 0 ? 1 : -1;
        if (Math.abs(currentLat) > orbitalInclination * 0.95) {
            direction = currentLat > 0 ? -1 : 1;
        }

        let lon = currentLon;
        let phase = currentPhase;

        for (let i = 1; i <= numPredictions; i++) {
            phase += direction * angularVelocity;
            let lat = orbitalInclination * Math.sin(phase);

            if (Math.abs(lat) > orbitalInclination) {
                lat = orbitalInclination * Math.sign(lat);
                direction *= -1;
            }

            lon += avgLonDelta;
            if (lon > 180) lon -= 360;
            if (lon < -180) lon += 360;

            predictedPoints.push([lat, lon]);
        }

        return predictedPoints;
    }

    function updateMapWithPosition(lat, lon) {
        if (!map) return;

        if (trailCoordinates.length > 0) {
            const prevCoord = trailCoordinates[trailCoordinates.length - 1];
            const deltaLat = lat - prevCoord[0];
            const deltaLon = lon - prevCoord[1];
            currentRotation = Math.atan2(deltaLon, deltaLat) * (180 / Math.PI);
        }

        if (issMarker) {
            issMarker.setLatLng([lat, lon]);
            issMarker.setIcon(createISSIcon(currentRotation));
            issCircle.setLatLng([lat, lon]);
            map.setView([lat, lon], 5, { animate: true, duration: 0.5 });
        } else {
            issMarker = L.marker([lat, lon], { icon: createISSIcon(currentRotation) }).addTo(map);
            issMarker.bindPopup('<b>International Space Station</b><br>Orbiting at ~408 km altitude<br>Speed: ~27,600 km/h');

            issCircle = L.circle([lat, lon], {
                color: '#00ff88',
                fillColor: '#00ff88',
                fillOpacity: 0.1,
                radius: 2000000
            }).addTo(map);

            map.setView([lat, lon], 5);
        }

        trailCoordinates.push([lat, lon]);
        if (trailCoordinates.length > maxTrailPoints) {
            trailCoordinates.shift();
        }

        if (trailPolyline) {
            map.removeLayer(trailPolyline);
        }

        trailPolyline = L.polyline(trailCoordinates, {
            color: '#00ff88',
            weight: 3,
            opacity: 0.8,
            smoothFactor: 1
        }).addTo(map);

        if (trailCoordinates.length >= 2) {
            const predictedPath = calculatePredictedPath(lat, lon, trailCoordinates);

            if (predictedPolyline) {
                map.removeLayer(predictedPolyline);
            }

            predictedPolyline = L.polyline(predictedPath, {
                color: '#cccccc',
                weight: 2,
                opacity: 0.6,
                smoothFactor: 1,
                dashArray: '5, 10'
            }).addTo(map);
        }

        setStatus({ online: true, text: '🟢 Live Tracking Active' });
    }

    onMount(() => {
        // Initialize Leaflet map
        map = L.map(mapContainer, {
            center: [0, 0],
            zoom: 5,
            zoomControl: false,
            worldCopyJump: true,
            minZoom: 5,
            maxZoom: 5
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        // Initial updates
        updateISSPosition();
        updateCrewInfo();

        // Set up intervals
        const positionInterval = setInterval(updateISSPosition, 10000);
        const crewInterval = setInterval(updateCrewInfo, 60000);

        onCleanup(() => {
            clearInterval(positionInterval);
            clearInterval(crewInterval);
            if (map) {
                map.remove();
            }
        });
    });

    async function updateLocation(lat, lon) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=5&accept-language=en`, {
                headers: {
                    'User-Agent': 'ISS-Tracker/1.0'
                }
            });
            const data = await response.json();

            if (data.address) {
                const country = data.address.country || '';
                const city = data.address.city || data.address.town || data.address.village || '';
                const ocean = data.address.ocean || data.address.sea || '';

                let loc = 'Open Ocean';
                if (city && country) {
                    loc = `${city}, ${country}`;
                } else if (country) {
                    loc = country;
                } else if (ocean) {
                    loc = ocean;
                }

                setLocation(loc);
            } else {
                setLocation('Open Ocean');
            }
        } catch (error) {
            console.error('Error fetching location:', error);
            setLocation('Unknown');
        }
    }

    async function updateISSPosition() {
        try {
            const response = await fetch('http://api.open-notify.org/iss-now.json');
            const data = await response.json();

            if (data.message === 'success') {
                const lat = parseFloat(data.iss_position.latitude);
                const lon = parseFloat(data.iss_position.longitude);

                updateMapWithPosition(lat, lon);
                updateLocation(lat, lon);

                setStatus({ online: true, text: '🟢 Live Tracking Active' });
            }
        } catch (error) {
            console.error('Error fetching ISS position:', error);
            setStatus({ online: false, text: '🔴 Connection Error' });
        }
    }

    async function updateCrewInfo() {
        try {
            const response = await fetch('http://api.open-notify.org/astros.json');
            const data = await response.json();

            if (data.message === 'success') {
                const issCrewCount = data.people.filter(p => p.craft === 'ISS').length;
                setCrew(issCrewCount);
            }
        } catch (error) {
            console.error('Error fetching crew info:', error);
            setCrew('Unknown');
        }
    }

    return (
        <div class="iss-tracker-screen">
            <div class="iss-map" ref={mapContainer}></div>

            <div class="iss-header">
                <div class="iss-header-cell">{crew()} CRW</div>
                <div class="iss-header-cell">{altitude()}</div>
                <div class="iss-header-cell">{location()}</div>
            </div>

            <div class="iss-status">{status().text}</div>

            <div class="iss-footer">
                Updates every 10s | ISS orbits Earth every ~90min
            </div>
        </div>
    );
}

export default ISSTrackerScreen;
