import asyncio
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


async def fetch_with_retry(client, url, params=None, headers=None, retries=3):
    for i in range(retries):
        res = await client.get(url, params=params, headers=headers)
        if res.status_code == 429:
            await asyncio.sleep(2 ** i)
            continue
        res.raise_for_status()
        return res
    raise httpx.HTTPStatusError(
        f"Rate limited after {retries} retries",
        request=res.request,
        response=res,
    )


@app.get("/api/weather")
async def get_weather(lat: float, lon: float):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m,relative_humidity_2m,weather_code,precipitation_probability,precipitation,wind_speed_10m",
        "daily": "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,precipitation_sum",
        "timezone": "Asia/Tokyo",
        "forecast_days": 7,
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await fetch_with_retry(client, url, params=params)
            data = response.json()
    except Exception as e:
        return JSONResponse(status_code=502, content={"error": str(e)})

    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    temps = hourly.get("temperature_2m", [])
    humidities = hourly.get("relative_humidity_2m", [])
    weather_codes = hourly.get("weather_code", [])
    precip_probs = hourly.get("precipitation_probability", [])
    precips = hourly.get("precipitation", [])
    winds = hourly.get("wind_speed_10m", [])

    hourly_data = []
    for i in range(len(times)):
        dt = times[i]
        month = int(dt[5:7])
        day = int(dt[8:10])
        hour = dt[11:13]
        hourly_data.append({
            "time": f"{month}/{day} {hour}時",
            "temperature": temps[i],
            "humidity": humidities[i],
            "weatherCode": weather_codes[i],
            "precipProbability": precip_probs[i] if i < len(precip_probs) else None,
            "precipitation": precips[i] if i < len(precips) else None,
            "windSpeed": winds[i] if i < len(winds) else None,
        })

    daily = data.get("daily", {})
    daily_times = daily.get("time", [])
    daily_data = []
    for i in range(len(daily_times)):
        dt = daily_times[i]
        month = int(dt[5:7])
        day = int(dt[8:10])
        daily_data.append({
            "date": f"{month}/{day}",
            "tempMax": daily.get("temperature_2m_max", [])[i],
            "tempMin": daily.get("temperature_2m_min", [])[i],
            "weatherCode": daily.get("weather_code", [])[i],
            "precipProbMax": daily.get("precipitation_probability_max", [])[i],
            "precipSum": daily.get("precipitation_sum", [])[i],
        })

    return {"forecast": hourly_data, "daily": daily_data}


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
