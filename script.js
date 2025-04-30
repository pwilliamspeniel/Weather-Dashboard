// Initialize the map
var mymap = L.map('map').setView([0, 0], 2);
var markers = [];

// Base layers
var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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
    markers.forEach(marker => {
        mymap.removeLayer(marker);
    });
    markers = [];
}

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

            let timeData = null;
            try {
                timeData = await fetchTimeData(latitude, longitude);
            } catch (error) {
                console.warn('Error fetching time data:', error);
                const now = new Date();
                timeData = {
                    hour: now.getHours(),
                    minute: now.getMinutes(),
                    day: now.getDate(),
                    month: now.getMonth() + 1,
                    year: now.getFullYear(),
                    day_of_week: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]
                };
            }

            let airQualityData = null;
            try {
                airQualityData = await fetchAirQualityData(latitude, longitude, weatherApiKey);
            } catch (error) {
                console.warn('Error fetching air quality data:', error);
            }

            processWeatherAndTimeData(weatherData, timeData, airQualityData);
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
            alert(`Could not find weather data for "${cityName}". Please check the city name and try again.`);
        });
}

async function fetchTimeData(latitude, longitude) {
    const timeApiURL = `https://api.api-ninjas.com/v1/worldtime?lat=${latitude}&lon=${longitude}`;
    const response = await fetch(timeApiURL, {
        headers: { 'X-Api-Key': '+pL9Hn/pkJztfJMA3sbtSw==Y9rEUsVG1ZzxbULo' }
    });

    if (!response.ok) {
        throw new Error(`Time API error: ${response.status}`);
    }

    return await response.json();
}

async function fetchAirQualityData(lat, lon, apiKey) {
    const airQualityURL = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const response = await fetch(airQualityURL);

    if (!response.ok) {
        throw new Error(`Air Quality API error: ${response.status}`);
    }

    return await response.json();
}

function processWeatherAndTimeData(weatherData, timeData, airQualityData) {
    if (!weatherData) {
        console.error('No weather data available');
        return;
    }

    currentTimeData = timeData ? { ...timeData } : null;

    var coordinates = [weatherData.coord.lat, weatherData.coord.lon];
    var popupContent = createPopupContent(weatherData, timeData, airQualityData);

    var marker = L.marker(coordinates)
        .bindPopup(popupContent, { maxWidth: 400, className: 'custom-popup' });

    markers.push(marker);
    marker.addTo(mymap);
    marker.openPopup();
    activePopup = marker;

    // Add event listener to render chart immediately when popup opens
    marker.on('popupopen', function() {
        renderAirQualityChart(airQualityData);
    });

    if (timeUpdateInterval) clearInterval(timeUpdateInterval);
    if (currentTimeData) {
        timeUpdateInterval = setInterval(updatePopupTime, 30000); // every 30 seconds
    }

    mymap.setView(coordinates, 10);
    
    // Render chart immediately instead of using setTimeout
    renderAirQualityChart(airQualityData);
}

function renderAirQualityChart(airQualityData) {
    if (airQualityData?.list?.[0]) {
        const components = airQualityData.list[0].components;
        const ctx = document.getElementById('aqiChart');
        if (ctx) {
            new Chart(ctx, {
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
    }
}

function createPopupContent(weatherData, timeData, airQualityData) {
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

    return `
        <div class="popup-scrollable" style="max-height: 400px; overflow-y: auto;">
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
            </div>
        </div>`;
}

function updatePopupTime() {
    if (!activePopup || !currentTimeData) return;

    const now = new Date();
    currentTimeData.hour = now.getHours();
    currentTimeData.minute = now.getMinutes();

    var hour = currentTimeData.hour.toString().padStart(2, '0');
    var minute = currentTimeData.minute.toString().padStart(2, '0');

    if (activePopup.isPopupOpen()) {
        var timeElement = document.getElementById('live-time');
        if (timeElement) {
            timeElement.innerHTML = `<strong>${hour}:${minute}</strong>`;
        }
    }
}