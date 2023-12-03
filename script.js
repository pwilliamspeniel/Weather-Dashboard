// initializing the map
var mymap = L.map('map').setView([0,0], 2); 

// openstreetmap base layer
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(mymap);

L.control.scale().addTo(mymap);

document.getElementById("navbar-brand").addEventListener('click', function (event) {
    event.preventDefault();
    mymap.setView([0,0], 2);
});

document.getElementById("searchForm").addEventListener('submit', function (event) {
    event.preventDefault();
    var cityName = document.getElementById("cityInput").value.trim()
    fetchWeatherData(cityName);
});

// fetching weather data
function fetchWeatherData(cityName) {
    const apiKey = "c51e179da9643be11e2b1dc65e6ec47f";
    const apiURL = `https://api.openweathermap.org/data/2.5/weather?&appid=${apiKey}&q=${cityName}&units=metric`;

    fetch(apiURL)
    .then(response => response.json())
    .then(data => processWeatherdata(data))
    .catch(error => console.error('Error:', error))  
}

function processWeatherdata(data) {
    var weather = data.weather[0].main; 
    var weatherIcon = data.weather[0].icon;
    var description = data.weather[0].description;
    var temperature = data.main.temp;
    var humidity = data.main.humidity;
    var windSpeed = data.wind.speed;
    var name = data.name; 
    var country = data.sys.country;
    var coordinates = [data.coord.lat, data.coord.lon];

    L.marker(coordinates)
    .bindPopup(`<h5 style = "margin-bottom: 5px;"> Weather Data for ${name}, ${country}</h5> 
    <div style = "display: flex; align-items: center;">
    <div style = "flex: 1; text-align: left;">
    <br> <strong> Temperature: </strong> ${temperature} °C 
    <br> <strong> Weather: </strong> ${weather} 
    <br> <strong> Description: </strong> ${description}
    <br> <strong> Humidity: </strong> ${humidity} %
    <br> <strong> Windspeed: </strong> ${windSpeed} m/s 
    </div>
    
    <div style = "flex": 1; text-align: right; align-items: center; justify-content: flex-end;"><img src = "https://openweathermap.org/img/wn/${weatherIcon}@2x.png"></img></div>
    </div>`)
    
    .addTo(mymap);

    mymap.setView(coordinates, 10);
}
