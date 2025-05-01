
// Initialize the map
var mymap = L.map('map').setView([0, 0], 2);
var markers = [];
var windyPopupContainer = null;

// Custom red circle icon
var redCircleIcon = L.divIcon({
    className: 'red-circle-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
});

// Base layers
var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(mymap);

var hybrid = L.tileLayer('http://{s}.google.com/vt?lyrs=s,h&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
});

var satellite = L.tileLayer('http://{s}.google.com/vt?lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
});

var terrain = L.tileLayer('http://{s}.google.com/vt?lyrs=p&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
});

// Windy API layer (initialized as null, will be populated later)
var windyLayer = null;

// Initialize Windy API
function initWindy() {
    // Only initialize Windy if not already initialized
    if (windyLayer !== null) return;

    // Set up Windy API options
    const options = {
        // Required: API key
        key: 'Efoh0xAbXSOu3FSQCfk4B0GE1OUmqW1v',

        // Put additional console output
        verbose: true,

        // Optional: Initial state of the map - will use current map view
        lat: mymap.getCenter().lat,
        lon: mymap.getCenter().lng,
        zoom: mymap.getZoom(),
    };

    // Set the windy initialization element
    const windyElement = document.createElement('div');
    windyElement.id = 'windy';
    windyElement.style.height = '100%';
    windyElement.style.width = '100%';
    windyElement.style.position = 'absolute';
    windyElement.style.top = '0';
    windyElement.style.left = '0';
    windyElement.style.zIndex = '401'; // Higher than Leaflet's panes but lower than popups (which are 700)
    document.querySelector('#map').appendChild(windyElement);

    // Initialize Windy API
    windyInit(options, windyAPI => {
        windyLayer = windyAPI;
        const { map, store } = windyAPI;
        
        // Hide Windy elements we don't need
        const bottomElement = document.querySelector('#windy #bottom');
        if (bottomElement) bottomElement.style.display = 'none';
        
        // Sync Windy map with our existing map
        map.setView([mymap.getCenter().lat, mymap.getCenter().lng], mymap.getZoom());
        
        // When our map is moved, also update Windy map
        mymap.on('moveend', () => {
            map.setView([mymap.getCenter().lat, mymap.getCenter().lng], mymap.getZoom());
        });
        
        // Add Windy markers for any existing markers
        recreateMarkersOnWindyMap(map);
        
        // Initially hide Windy (we'll show it when the user selects it)
        document.querySelector('#windy').style.display = 'none';
    });
}

// Function to recreate markers on Windy map
function recreateMarkersOnWindyMap(windyMap) {
    if (!windyMap) return;
    
    // Clear any existing Windy markers first
    if (window.windyMarkers) {
        window.windyMarkers.forEach(marker => {
            windyMap.removeLayer(marker);
        });
    }
    
    window.windyMarkers = [];
    
    // Recreate each marker on the Windy map
    markers.forEach(marker => {
        const latLng = marker.getLatLng();
        const popupContent = marker.getPopup().getContent();
        
        // Create a new marker on the Windy map with the same icon and popup
        const windyMarker = L.marker([latLng.lat, latLng.lng], { icon: redCircleIcon })
            .bindPopup(popupContent, { maxWidth: 400, className: 'custom-popup' });
        
        windyMarker.on('popupopen', function() {
            requestAnimationFrame(() => {
                // Get canvas elements in this popup
                const popup = windyMarker.getPopup();
                if (!popup) return;
                
                const popupElement = popup.getElement();
                if (!popupElement) return;
                
                const aqiChart = popupElement.querySelector('#aqiChart');
                const forecastChart = popupElement.querySelector('#forecastChart');
                
                if (aqiChart && currentAirQualityData) {
                    renderAirQualityChartOn(aqiChart, currentAirQualityData, 'windyAqiChartInstance');
                }
                
                if (forecastChart && currentForecastData) {
                    renderForecastChartOn(forecastChart, currentForecastData, 'windyForecastChartInstance');
                }
            });
        });
        
        windyMarker.addTo(windyMap);
        window.windyMarkers.push(windyMarker);
    });
}

// Add Windy toggle button
var windyButton = L.control({ position: 'topright' });
windyButton.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info windy-button');
    div.innerHTML = '<button type="button" class="btn btn-info" id="toggleWindyBtn"> 🌬️ Windy</button>';
    return div;
};
windyButton.addTo(mymap);

// Handle Windy toggle
document.getElementById("toggleWindyBtn").addEventListener('click', function () {
    // Initialize Windy if not already done
    if (windyLayer === null) {
        initWindy();
        setTimeout(() => {
            toggleWindyDisplay();
        }, 1000); // Give time for Windy to initialize
    } else {
        toggleWindyDisplay();
    }
});

function toggleWindyDisplay() {
    const windyElement = document.querySelector('#windy');
    if (windyElement) {
        if (windyElement.style.display === 'none') {
            windyElement.style.display = 'block';
            document.getElementById("toggleWindyBtn").classList.add('active');
            
            // Update Windy map and markers when Windy is shown
            if (windyLayer && windyLayer.map) {
                // Re-sync the view
                windyLayer.map.setView([mymap.getCenter().lat, mymap.getCenter().lng], mymap.getZoom());
                
                // Recreate markers on Windy map
                recreateMarkersOnWindyMap(windyLayer.map);
            }
        } else {
            windyElement.style.display = 'none';
            document.getElementById("toggleWindyBtn").classList.remove('active');
        }
    }
}

var baseLayers = {
    "OpenStreetMap": osm,
    "Google Hybrid": hybrid,
    "Google Satellite": satellite,
    "Google Terrain": terrain
};

L.control.layers(baseLayers).addTo(mymap);
L.control.scale().addTo(mymap);

// Clear markers button
var clearButton = L.control({ position: 'topright' });
clearButton.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info clear-button');
    div.innerHTML = '<button type="button" class="btn btn-danger" id="clearMarkersBtn">🗑️</button>';
    return div;
};
clearButton.addTo(mymap);

document.getElementById("clearMarkersBtn").addEventListener('click', function () {
    clearAllMarkers();
});

function clearAllMarkers() {
    // Clear markers from main map
    markers.forEach(marker => {
        mymap.removeLayer(marker);
    });
    markers = [];
    
    // Clear markers from Windy map
    if (window.windyMarkers && windyLayer && windyLayer.map) {
        window.windyMarkers.forEach(marker => {
            windyLayer.map.removeLayer(marker);
        });
        window.windyMarkers = [];
    }
}

// No need for these functions anymore with the new approach


document.getElementById("navbar-brand").addEventListener('click', function (event) {
    event.preventDefault();
    mymap.setView([0, 0], 2);
});

document.getElementById("searchForm").addEventListener('submit', function (event) {
    event.preventDefault();
    var cityName = document.getElementById("cityInput").value.trim();
    fetchWeatherAndTimeData(cityName);
});

var currentTimeData = null;
var activePopup = null;
var timeUpdateInterval = null;
var currentAirQualityData = null;
var currentForecastData = null;

function fetchWeatherAndTimeData(cityName) {
    const weatherApiKey = "c51e179da9643be11e2b1dc65e6ec47f";
    const weatherApiURL = `https://api.openweathermap.org/data/2.5/weather?&appid=${weatherApiKey}&q=${cityName}&units=imperial`;

    fetch(weatherApiURL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Weather API error: ${response.status}`);
            }
            return response.json();
        })
        .then(async weatherData => {
            var latitude = weatherData.coord.lat;
            var longitude = weatherData.coord.lon;

            // Start all API requests in parallel
            const timeDataPromise = fetchTimeData(latitude, longitude);
            const airQualityPromise = fetchAirQualityData(latitude, longitude, weatherApiKey)
                .catch(error => {
                    console.warn('Error fetching air quality data:', error);
                    return null;
                });
            const forecastPromise = fetchForecastData(latitude, longitude, weatherApiKey)
                .catch(error => {
                    console.warn('Error fetching forecast data:', error);
                    return null;
                });

            // Wait for all API requests to complete (or fail gracefully)
            const [timeData, airQualityData, forecastData] = await Promise.all([
                timeDataPromise, 
                airQualityPromise, 
                forecastPromise
            ]);

            // Store data globally
            currentTimeData = timeData;
            currentAirQualityData = airQualityData;
            currentForecastData = forecastData;

            // Process data and display on map
            processWeatherAndTimeData(weatherData, timeData, airQualityData, forecastData);
            
            // Update Windy focus if it's active
            if (windyLayer !== null && document.querySelector('#windy').style.display !== 'none') {
                windyLayer.map.setView([latitude, longitude], 10);
            }
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
            alert(`Could not find weather data for "${cityName}". Please check the city name and try again.`);
        });
}

async function fetchTimeData(latitude, longitude) {
    try {
        const timeApiURL = `https://api.api-ninjas.com/v1/worldtime?lat=${latitude}&lon=${longitude}`;
        const response = await fetch(timeApiURL, {
            headers: { 'X-Api-Key': '1xyssKcbwFyioKMLXsNOYQ==DNu2gjkMpTwSnGJs' }
        });

        if (!response.ok) {
            throw new Error(`Time API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.warn('Time API error, using local time instead:', error);
        // Return local time as fallback
        const now = new Date();
        return {
            hour: now.getHours(),
            minute: now.getMinutes(),
            day: now.getDate(),
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            day_of_week: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]
        };
    }
}

async function fetchAirQualityData(lat, lon, apiKey) {
    const airQualityURL = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const response = await fetch(airQualityURL);

    if (!response.ok) {
        throw new Error(`Air Quality API error: ${response.status}`);
    }

    return await response.json();
}

async function fetchForecastData(lat, lon, apiKey) {
    const forecastURL = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
    const response = await fetch(forecastURL);

    if (!response.ok) {
        throw new Error(`Forecast API error: ${response.status}`);
    }

    return await response.json();
}

function processWeatherAndTimeData(weatherData, timeData, airQualityData, forecastData) {
    if (!weatherData) {
        console.error('No weather data available');
        return;
    }

    var coordinates = [weatherData.coord.lat, weatherData.coord.lon];
    var popupContent = createPopupContent(weatherData, timeData, airQualityData, forecastData);

    // Use the custom red circle icon for the marker
    var marker = L.marker(coordinates, { icon: redCircleIcon })
        .bindPopup(popupContent, { maxWidth: 400, className: 'custom-popup' });

    marker.on('popupopen', function() {
        activePopup = marker;
        
        requestAnimationFrame(() => {
            renderAirQualityChart(currentAirQualityData);
            renderForecastChart(currentForecastData);
        });
    });
    
    marker.on('popupclose', function() {
        activePopup = null;
    });

    markers.push(marker);
    marker.addTo(mymap);
    marker.openPopup();
    
    // Add the marker to the Windy map if it's initialized and visible
    if (windyLayer && windyLayer.map && document.querySelector('#windy').style.display !== 'none') {
        recreateMarkersOnWindyMap(windyLayer.map);
    }
    
    if (timeUpdateInterval) clearInterval(timeUpdateInterval);
    if (currentTimeData) {
        timeUpdateInterval = setInterval(updatePopupTime, 30000); // every 30 seconds
    }

    mymap.setView(coordinates, 10);
}

function renderAirQualityChart(airQualityData) {
    const ctx = document.getElementById('aqiChart');
    if (!ctx || !airQualityData?.list?.[0]) return;
    
    renderAirQualityChartOn(ctx, airQualityData, 'aqiChartInstance');
}

function renderAirQualityChartOn(canvas, airQualityData, instanceName) {
    if (!canvas || !airQualityData?.list?.[0]) return;
    
    if (window[instanceName]) {
        window[instanceName].destroy();
    }
    
    const components = airQualityData.list[0].components;
    
    window[instanceName] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['PM2.5', 'PM10', 'CO', 'NO₂', 'O₃'],
            datasets: [{
                label: 'Air Pollutant Concentration (µg/m³)',
                data: [
                    components.pm2_5 || 0.01,
                    components.pm10 || 0.01,
                    components.co || 0.01,
                    components.no2 || 0.01,
                    components.o3 || 0.01
                ],
                backgroundColor: [
                    '#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF'
                ]
            }]
        },
        options: {
            responsive: false,
            scales: {
                y: {
                    type: 'logarithmic',
                    min: 0.1,
                    title: {
                        display: true,
                        text: 'Concentration (µg/m³, log scale)'
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.parsed.y} µg/m³`
                    }
                }
            }
        }
    });
}

function renderForecastChart(forecastData) {
    const ctx = document.getElementById('forecastChart');
    if (!ctx || !forecastData?.list) return;
    
    renderForecastChartOn(ctx, forecastData, 'forecastChartInstance');
}

function renderForecastChartOn(canvas, forecastData, instanceName) {
    if (!canvas || !forecastData?.list) return;
    
    if (window[instanceName]) {
        window[instanceName].destroy();
    }
    
    const processedData = processForecastData(forecastData);
    
    window[instanceName] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: processedData.labels,
            datasets: [
                {
                    label: 'Temperature (°F)',
                    data: processedData.temperatures,
                    borderColor: '#FF6384',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    yAxisID: 'y',
                    tension: 0.1,
                    fill: false
                },
                {
                    label: 'Humidity (%)',
                    data: processedData.humidity,
                    borderColor: '#36A2EB',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    yAxisID: 'y1',
                    tension: 0.1,
                    fill: false
                }
            ]
        },
        options: {
            responsive: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Date/Time'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Temperature (°F)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Humidity (%)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

function processForecastData(forecastData) {
    const result = {
        labels: [],
        temperatures: [],
        humidity: []
    };
    
    const dataPoints = forecastData.list.filter((item, index) => index % 2 === 0);
    
    dataPoints.forEach(item => {
        const date = new Date(item.dt * 1000);
        const formattedDate = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:00`;
        
        result.labels.push(formattedDate);
        result.temperatures.push(item.main.temp);
        result.humidity.push(item.main.humidity);
    });
    
    return result;
}

function createPopupContent(weatherData, timeData, airQualityData, forecastData) {
    var weather = weatherData.weather[0].main;
    var weatherIcon = weatherData.weather[0].icon;
    var description = weatherData.weather[0].description;
    var temperature = weatherData.main.temp;
    var feelsLike = weatherData.main.feels_like;
    var humidity = weatherData.main.humidity;
    var windSpeed = weatherData.wind.speed;
    var name = weatherData.name;
    var country = weatherData.sys.country;

    let timeSection = '';
    if (timeData) {
        var hour = timeData.hour.toString().padStart(2, '0');
        var minute = timeData.minute.toString().padStart(2, '0');
        var day = timeData.day;
        var month = timeData.month;
        var year = timeData.year;
        var day_of_week = timeData.day_of_week;

        timeSection = `
            <div class="time-section">
                <div class="huge-time" id="live-time">
                    <strong>${hour}:${minute}</strong>
                </div>
                <div class="date">
                    ${day_of_week}, ${day}-${month}-${year}
                </div>
            </div>
            <br>
        `;
    } else {
        timeSection = `
            <div class="time-section">
                <div class="error-message">
                    <p>Time data unavailable.</p>
                </div>
            </div>
            <br>
        `;
    }

    let aqiSection = '';
    if (airQualityData?.list?.[0]) {
        var aqi = airQualityData.list[0].main.aqi;
        var components = airQualityData.list[0].components;

        const aqiLevels = {
            1: "Good", 2: "Fair", 3: "Moderate", 4: "Poor", 5: "Very Poor"
        };

        const aqiColors = {
            1: "#009966", 2: "#ffde33", 3: "#ff9933", 4: "#cc0033", 5: "#660099"
        };

        const aqiBadge = `<span style="background-color:${aqiColors[aqi]}; color:white; padding:2px 6px; border-radius:4px;">${aqiLevels[aqi]}</span>`;

        aqiSection = `
            <h5 class="weather-heading">Air Quality Index (AQI)</h5>
            <p><strong>AQI:</strong> ${aqi} ${aqiBadge}</p>
            <canvas id="aqiChart" width="350" height="250"></canvas>
        `;
    } else {
        aqiSection = `
            <h5 class="weather-heading">Air Quality Index (AQI)</h5>
            <p>Air quality data unavailable</p>
        `;
    }
    
    let forecastSection = '';
    if (forecastData?.list) {
        forecastSection = `
            <h5 class="weather-heading">5-Day Weather Forecast</h5>
            <canvas id="forecastChart" width="350" height="250"></canvas>
        `;
    } else {
        forecastSection = `
            <h5 class="weather-heading">5-Day Weather Forecast</h5>
            <p>Forecast data unavailable</p>
        `;
    }

    return `
        <div class="popup-scrollable" style="max-height: 500px; overflow-y: auto;">
            <div class="popup-container custom-popup-width">
                <div class="location-heading">
                    <h3>Data for ${name}, ${country}</h3>
                </div>
                <hr>
                ${timeSection}
                <h5 class="weather-heading">Weather Data</h5>
                <div class="weather-section">
                    <div class="weather-info">
                        <p><strong>Temperature:</strong> ${temperature} °F</p>
                        <p><strong>Feels Like:</strong> ${feelsLike} °F</p>
                        <p><strong>Weather:</strong> ${weather}</p>
                        <p><strong>Description:</strong> ${description}</p>
                        <p><strong>Humidity:</strong> ${humidity} %</p>
                        <p><strong>Wind Speed:</strong> ${windSpeed} mph</p>
                    </div>
                    <div class="weather-icon">
                        <img src="https://openweathermap.org/img/wn/${weatherIcon}@2x.png">
                    </div>
                </div>
                <br>
                ${aqiSection}
                <br>
                ${forecastSection}
            </div>
        </div>`;
}

function updatePopupTime() {
    if (!currentTimeData) return;

    const now = new Date();
    currentTimeData.hour = now.getHours();
    currentTimeData.minute = now.getMinutes();

    var hour = currentTimeData.hour.toString().padStart(2, '0');
    var minute = currentTimeData.minute.toString().padStart(2, '0');

    // Update time in all open popups (both in Leaflet and Windy maps)
    const timeElements = document.querySelectorAll('#live-time');
    timeElements.forEach(timeElement => {
        if (timeElement) {
            timeElement.innerHTML = `<strong>${hour}:${minute}</strong>`;
        }
    });
}