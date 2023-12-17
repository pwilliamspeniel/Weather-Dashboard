// initializing the map
var mymap = L.map('map').setView([0,0], 2);

// base layers
var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(mymap);

var hybrid = googleHybrid = L.tileLayer('http://{s}.google.com/vt?lyrs=s,h&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
});

var satellite = googleSat = L.tileLayer('http://{s}.google.com/vt?lyrs=s&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
});

var terrain = googleTerrain = L.tileLayer('http://{s}.google.com/vt?lyrs=p&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
});

var baseLayers = {
    "OpenStreetMap": osm,
    "Google Hybrid": hybrid,
    "Google Satellite": satellite,
    "Google terrain": terrain,
};

L.control.layers(baseLayers).addTo(mymap);

// adding scale to map
L.control.scale().addTo(mymap);


document.getElementById("navbar-brand").addEventListener('click', function (event) {
    event.preventDefault();
    mymap.setView([0,0], 2);
});

document.getElementById("searchForm").addEventListener('submit', function (event) {
    event.preventDefault();
    var cityName = document.getElementById("cityInput").value.trim()
    fetchWeatherAndTimeData(cityName);
});


// fetching weather and time data
function fetchWeatherAndTimeData(cityName) {
    const weatherApiKey = "c51e179da9643be11e2b1dc65e6ec47f";  // Replace with your OpenWeatherMap API key
    const weatherApiURL = `https://api.openweathermap.org/data/2.5/weather?&appid=${weatherApiKey}&q=${cityName}&units=metric`;

    fetch(weatherApiURL)
    .then(response => response.json())
    .then(async weatherData => {
        var latitude = weatherData.coord.lat;
        var longitude = weatherData.coord.lon;

        const timeData = await fetchTimeData(latitude, longitude);
        processWeatherAndTimeData(weatherData, timeData);
    })
    .catch(error => console.error('Error fetching data:', error));
}

// Function to fetch time data using latitude and longitude
async function fetchTimeData(latitude, longitude) {
    const timeApiURL = `https://api.api-ninjas.com/v1/worldtime?lat=${latitude}&lon=${longitude}`;
    const response = await fetch(timeApiURL, {
        headers: {
            'X-Api-Key': '+pL9Hn/pkJztfJMA3sbtSw==Y9rEUsVG1ZzxbULo', // Replace with your API key
        },
    });
    return await response.json();
}

// function to process weather and time data
function processWeatherAndTimeData(weatherData, timeData) {
    var weather = weatherData.weather[0].main; 
    var weatherIcon = weatherData.weather[0].icon;
    var description = weatherData.weather[0].description;
    var temperature = weatherData.main.temp;
    var humidity = weatherData.main.humidity;
    var windSpeed = weatherData.wind.speed;
    var name = weatherData.name; 
    var country = weatherData.sys.country;
    var coordinates = [weatherData.coord.lat, weatherData.coord.lon];

    var day = timeData.day;
    var month = timeData.month;
    var year = timeData.year;

    var hour = timeData.hour;
    var minute = timeData.minute;

    var day_of_the_week = timeData.day_of_week;

    // pop up information
    L.marker(coordinates)
    .bindPopup(`
        <div class="popup-container custom-popup-width">
            <div class="location-heading">
                <h3>Data for ${name}, ${country}</h3>
            </div>
            <hr>
            <div class="time-section">

                <div class="huge-time">
                    <strong>${hour}:${minute}</strong>
                </div>
                <div class="date">
                    ${day_of_the_week}, ${day}-${month}-${year}
                </div>
            </div>
            <br>

            <h5 class="weather-heading">Weather Data</h5>
            <div class="weather-section">
                <div class="weather-info">
                    <p><strong>Temperature:</strong> ${temperature} °C</p>
                    <p><strong>Weather:</strong> ${weather}</p>
                    <p><strong>Description:</strong> ${description}</p>
                    <p><strong>Humidity:</strong> ${humidity} %</p>
                    <p><strong>Windspeed:</strong> ${windSpeed} m/s</p>
                </div>
                <div class="weather-icon">
                    <img src="https://openweathermap.org/img/wn/${weatherIcon}@2x.png">
                </div>
            </div>
        </div>
    `)
    .addTo(mymap);

mymap.setView(coordinates, 10);

}

