import asyncio
from datetime import date, timedelta
from typing import Optional
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
async def get_weather(lat: float, lon: float, start_date: Optional[str] = None):
    today = date.today()
    if start_date:
        sd = date.fromisoformat(start_date)
    else:
        sd = today
    ed = sd + timedelta(days=6)

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            data = {"hourly": {}, "daily": {}}

            # 過去分: Archive API (ERA5 再解析データ)
            if sd < today:
                archive_end = min(ed, today - timedelta(days=1))
                archive_params = {
                    "latitude": lat, "longitude": lon,
                    "hourly": "temperature_2m,relative_humidity_2m,weather_code,precipitation,wind_speed_10m",
                    "daily": "temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum",
                    "timezone": "Asia/Tokyo",
                    "start_date": sd.isoformat(),
                    "end_date": archive_end.isoformat(),
                }
                res = await fetch_with_retry(client, "https://archive-api.open-meteo.com/v1/archive", params=archive_params)
                data = res.json()

            # 未来分 (今日含む): Forecast API
            if ed >= today:
                forecast_start = max(sd, today)
                forecast_params = {
                    "latitude": lat, "longitude": lon,
                    "hourly": "temperature_2m,relative_humidity_2m,weather_code,precipitation_probability,precipitation,wind_speed_10m",
                    "daily": "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,precipitation_sum",
                    "timezone": "Asia/Tokyo",
                    "start_date": forecast_start.isoformat(),
                    "end_date": ed.isoformat(),
                }
                res = await fetch_with_retry(client, "https://api.open-meteo.com/v1/forecast", params=forecast_params)
                forecast_data = res.json()

                if sd < today:
                    for key in data.get("hourly", {}):
                        if key in forecast_data.get("hourly", {}):
                            data["hourly"][key] = data["hourly"][key] + forecast_data["hourly"][key]
                    for key in data.get("daily", {}):
                        if key in forecast_data.get("daily", {}):
                            data["daily"][key] = data["daily"][key] + forecast_data["daily"][key]
                else:
                    data = forecast_data
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
        precip_prob_max_list = daily.get("precipitation_probability_max", [])
        daily_data.append({
            "date": f"{month}/{day}",
            "tempMax": daily.get("temperature_2m_max", [])[i],
            "tempMin": daily.get("temperature_2m_min", [])[i],
            "weatherCode": daily.get("weather_code", [])[i],
            "precipProbMax": precip_prob_max_list[i] if i < len(precip_prob_max_list) else None,
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
