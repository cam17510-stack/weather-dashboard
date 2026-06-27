from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

NOMINATIM_HEADERS = {"User-Agent": "WeatherDashboard/1.0"}


@app.get("/api/weather")
async def get_weather(lat: float, lon: float):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m,relative_humidity_2m,weather_code",
        "timezone": "Asia/Tokyo",
        "forecast_days": 2,
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
    except Exception as e:
        return JSONResponse(
            status_code=502,
            content={"error": f"Open-Meteo API error: {str(e)}"},
        )

    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    temps = hourly.get("temperature_2m", [])
    humidities = hourly.get("relative_humidity_2m", [])
    weather_codes = hourly.get("weather_code", [])

    formatted = []
    for i in range(len(times)):
        dt = times[i]
        month = int(dt[5:7])
        day = int(dt[8:10])
        hour = dt[11:13]
        formatted.append({
            "time": f"{month}/{day} {hour}時",
            "temperature": temps[i],
            "humidity": humidities[i],
            "weatherCode": weather_codes[i],
        })
    return {"forecast": formatted}


@app.get("/api/zipcode")
async def search_zipcode(code: str):
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(
            "https://zipcloud.ibsnet.co.jp/api/search",
            params={"zipcode": code},
        )
        return res.json()


@app.get("/api/geocode")
async def geocode(q: str):
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": q, "format": "json", "countrycodes": "jp", "limit": 1},
            headers=NOMINATIM_HEADERS,
        )
        return res.json()


@app.get("/api/reverse-geocode")
async def reverse_geocode(lat: float, lon: float):
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                "lat": lat, "lon": lon,
                "format": "json", "accept-language": "ja", "zoom": 16,
            },
            headers=NOMINATIM_HEADERS,
        )
        return res.json()
