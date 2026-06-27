import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Bar,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine, ComposedChart
} from 'recharts';
import {
  MapPin, Thermometer, Droplets, Search, Wind, Calendar,
  Sun, Cloud, CloudRain, CloudSnow,
  CloudLightning, CloudDrizzle, CloudFog, Umbrella, ChevronLeft, ChevronRight
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const REGIONS = [
  { code: '130000', name: '東京', lat: 35.6895, lon: 139.6917 },
  { code: '270000', name: '大阪', lat: 34.6937, lon: 135.5023 },
  { code: '016000', name: '札幌', lat: 43.0618, lon: 141.3545 },
  { code: '400000', name: '福岡', lat: 33.5902, lon: 130.4017 },
  { code: '471000', name: '那覇', lat: 26.2124, lon: 127.6809 },
];

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function toAPIDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeatherInfo(code) {
  if (code === 0) return { desc: '快晴',      icon: Sun,            color: 'text-yellow-500', bg: 'bg-yellow-50' };
  if (code <= 3)  return { desc: '晴れ/曇り',  icon: Cloud,          color: 'text-yellow-400', bg: 'bg-yellow-50' };
  if (code <= 48) return { desc: '霧',         icon: CloudFog,       color: 'text-gray-400',   bg: 'bg-gray-50'   };
  if (code <= 55) return { desc: '霧雨',       icon: CloudDrizzle,   color: 'text-blue-300',   bg: 'bg-blue-50'   };
  if (code <= 65) return { desc: '雨',         icon: CloudRain,      color: 'text-blue-500',   bg: 'bg-blue-50'   };
  if (code <= 75) return { desc: '雪',         icon: CloudSnow,      color: 'text-sky-300',    bg: 'bg-sky-50'    };
  if (code <= 82) return { desc: 'にわか雨',   icon: CloudRain,      color: 'text-blue-600',   bg: 'bg-blue-50'   };
  if (code <= 99) return { desc: '雷雨',       icon: CloudLightning, color: 'text-purple-500', bg: 'bg-purple-50' };
  return                  { desc: '不明',       icon: Cloud,          color: 'text-gray-500',   bg: 'bg-gray-50'   };
}

function nowLabel() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}時`;
}

function getDayLabel(dateStr, startDate) {
  const [m, d] = dateStr.split('/').map(Number);
  const target = new Date(startDate.getFullYear(), m - 1, d);
  const today = new Date();
  today.setHours(0,0,0,0);
  const diff = Math.round((target - today) / 86400000);
  const wd = WEEKDAYS[target.getDay()];
  if (diff === 0) return `今日(${wd})`;
  if (diff === 1) return `明日(${wd})`;
  return `${m}/${d}(${wd})`;
}

function MonthCalendar({ year, month, selectedDate, today, minDate, maxDate, onSelect }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(today);
  const selectedKey = toDateKey(selectedDate);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="flex-1 min-w-0">
      <p className="text-center text-sm font-bold text-gray-700 mb-2">{year}年 {MONTH_NAMES[month]}</p>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((wd, i) => (
          <div key={wd} className={`text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>{wd}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const date = new Date(year, month, day);
          const key = toDateKey(date);
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const isDisabled = date < minDate || date > maxDate;
          const dow = date.getDay();
          let cls = 'text-xs py-1 rounded-lg cursor-pointer transition-all ';
          if (isSelected) cls += 'bg-blue-500 text-white font-bold shadow-md ';
          else if (isToday) cls += 'bg-orange-100 text-orange-700 font-bold border border-orange-300 ';
          else if (isDisabled) cls += 'text-gray-300 cursor-default ';
          else if (dow === 0) cls += 'text-red-500 hover:bg-red-50 ';
          else if (dow === 6) cls += 'text-blue-500 hover:bg-blue-50 ';
          else cls += 'text-gray-700 hover:bg-gray-100 ';
          return (
            <div key={key} className={cls}
              onClick={() => !isDisabled && onSelect(date)}>
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThreeMonthCalendar({ selectedDate, onSelect }) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() - 92);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 9);

  const [centerMonth, setCenterMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const prevMonth = new Date(centerMonth.getFullYear(), centerMonth.getMonth() - 1, 1);
  const nextMonth = new Date(centerMonth.getFullYear(), centerMonth.getMonth() + 1, 1);

  const goBack = () => setCenterMonth(new Date(centerMonth.getFullYear(), centerMonth.getMonth() - 1, 1));
  const goForward = () => setCenterMonth(new Date(centerMonth.getFullYear(), centerMonth.getMonth() + 1, 1));
  const goToday = () => {
    setCenterMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onSelect(today);
  };

  return (
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-5 shadow-xl border border-white/60">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="text-blue-500 w-5 h-5" />起点日を選択
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={goToday} className="text-xs bg-blue-50 text-blue-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">今日</button>
          <button onClick={goForward} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="flex gap-4">
        <MonthCalendar year={prevMonth.getFullYear()} month={prevMonth.getMonth()} selectedDate={selectedDate} today={today} minDate={minDate} maxDate={maxDate} onSelect={onSelect} />
        <MonthCalendar year={centerMonth.getFullYear()} month={centerMonth.getMonth()} selectedDate={selectedDate} today={today} minDate={minDate} maxDate={maxDate} onSelect={onSelect} />
        <MonthCalendar year={nextMonth.getFullYear()} month={nextMonth.getMonth()} selectedDate={selectedDate} today={today} minDate={minDate} maxDate={maxDate} onSelect={onSelect} />
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        選択中: {selectedDate.getFullYear()}年{selectedDate.getMonth()+1}月{selectedDate.getDate()}日 から7日間を表示
      </p>
    </div>
  );
}

function MapEvents({ onClick }) {
  useMapEvents({ click: e => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, 13, { duration: 0.8 }); }, [center, map]);
  return null;
}

export default function App() {
  const [lat, setLat]                       = useState(REGIONS[0].lat);
  const [lon, setLon]                       = useState(REGIONS[0].lon);
  const [regionCode, setRegionCode]         = useState(REGIONS[0].code);
  const [locationName, setLocationName]     = useState(REGIONS[0].name);
  const [postalCode, setPostalCode]         = useState('');
  const [address, setAddress]               = useState('');
  const [weatherData, setWeatherData]       = useState([]);
  const [dailyData, setDailyData]           = useState([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);
  const [currentTime, setCurrentTime]       = useState(nowLabel());
  const [startDate, setStartDate]           = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });

  const isToday = toDateKey(startDate) === toDateKey(new Date());

  useEffect(() => { fetchWeather(); }, [lat, lon, startDate]);

  const parseResponse = (data) => {
    const h = data.hourly || {};
    const times = h.time || [];
    const hourly = times.map((t, i) => ({
      time: `${parseInt(t.substring(5,7))}/${t.substring(8,10)} ${t.substring(11,13)}時`,
      temperature: h.temperature_2m[i],
      humidity: h.relative_humidity_2m[i],
      weatherCode: h.weather_code[i],
      precipProbability: h.precipitation_probability?.[i] ?? null,
      precipitation: h.precipitation?.[i] ?? null,
      windSpeed: h.wind_speed_10m?.[i] ?? null,
    }));
    const d = data.daily || {};
    const dTimes = d.time || [];
    const daily = dTimes.map((t, i) => ({
      date: `${parseInt(t.substring(5,7))}/${t.substring(8,10)}`,
      tempMax: d.temperature_2m_max[i],
      tempMin: d.temperature_2m_min[i],
      weatherCode: d.weather_code[i],
      precipProbMax: d.precipitation_probability_max?.[i] ?? null,
      precipSum: d.precipitation_sum?.[i] ?? null,
    }));
    return { hourly, daily };
  };

  const fetchWeatherDirect = async () => {
    const sd = toAPIDate(startDate);
    const ed = new Date(startDate);
    ed.setDate(ed.getDate() + 6);
    const edStr = toAPIDate(ed);
    const today = new Date();
    today.setHours(0,0,0,0);
    const hourlyBase = 'temperature_2m,relative_humidity_2m,weather_code,precipitation,wind_speed_10m';
    const dailyBase = 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum';
    let merged = null;

    if (startDate < today) {
      const archiveEnd = ed < today ? edStr : toAPIDate(new Date(today.getTime() - 86400000));
      const aRes = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&hourly=${hourlyBase}&daily=${dailyBase}&timezone=Asia/Tokyo&start_date=${sd}&end_date=${archiveEnd}`);
      if (aRes.ok) merged = await aRes.json();
    }

    if (ed >= today) {
      const fStart = startDate >= today ? sd : toAPIDate(today);
      const fRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${hourlyBase},precipitation_probability&daily=${dailyBase},precipitation_probability_max&timezone=Asia/Tokyo&start_date=${fStart}&end_date=${edStr}`);
      if (!fRes.ok) throw new Error(`HTTP ${fRes.status}`);
      const fData = await fRes.json();
      if (merged) {
        for (const key of Object.keys(merged.hourly || {})) {
          if (fData.hourly?.[key]) merged.hourly[key] = merged.hourly[key].concat(fData.hourly[key]);
        }
        for (const key of Object.keys(merged.daily || {})) {
          if (fData.daily?.[key]) merged.daily[key] = merged.daily[key].concat(fData.daily[key]);
        }
      } else {
        merged = fData;
      }
    }

    return parseResponse(merged || {});
  };

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    setCurrentTime(nowLabel());
    const dateParam = isToday ? '' : `&start_date=${toAPIDate(startDate)}`;
    try {
      const res = await fetch(`${API}/api/weather?lat=${lat}&lon=${lon}${dateParam}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.forecast && data.forecast.length > 0) {
        setWeatherData(data.forecast);
        setDailyData(data.daily || []);
      } else {
        const d = await fetchWeatherDirect();
        setWeatherData(d.hourly);
        setDailyData(d.daily);
      }
    } catch {
      try {
        const d = await fetchWeatherDirect();
        setWeatherData(d.hourly);
        setDailyData(d.daily);
      } catch {
        setError('天気データの取得に失敗しました。しばらく待ってからリロードしてください。');
      }
    }
    setLoading(false);
  };

  const handleRegionChange = (e) => {
    const r = REGIONS.find(r => r.code === e.target.value);
    if (!r) return;
    setRegionCode(r.code); setLocationName(r.name);
    setPostalCode(''); setAddress('');
    setLat(r.lat); setLon(r.lon);
  };

  const handlePostalCodeSearch = async () => {
    const cleaned = postalCode.replace(/[-ー－\s]/g, '');
    if (cleaned.length !== 7) return;
    try {
      const res = await fetch(`${API}/api/zipcode?code=${cleaned}`);
      const data = await res.json();
      if (!data.results || data.results.length === 0) return;
      const r = data.results[0];
      const full = r.address1 + r.address2 + r.address3;
      setAddress(full); setLocationName(full); setRegionCode('');
      const geoRes = await fetch(`${API}/api/geocode?q=${encodeURIComponent(full)}`);
      const geo = await geoRes.json();
      if (geo.length > 0) { setLat(parseFloat(geo[0].lat)); setLon(parseFloat(geo[0].lon)); }
    } catch (err) { console.error('郵便番号検索失敗', err); }
  };

  const handleAddressSearch = async () => {
    if (!address.trim()) return;
    try {
      const res = await fetch(`${API}/api/geocode?q=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (data.length > 0) {
        setLat(parseFloat(data[0].lat)); setLon(parseFloat(data[0].lon));
        setLocationName(address); setRegionCode('');
      }
    } catch (err) { console.error('住所検索失敗', err); }
  };

  const handleMapClick = async (clickLat, clickLon) => {
    setLat(clickLat); setLon(clickLon); setRegionCode('');
    try {
      const res = await fetch(`${API}/api/reverse-geocode?lat=${clickLat}&lon=${clickLon}`);
      const data = await res.json();
      if (data.address) {
        const a = data.address;
        const full = [a.province, a.city, a.town, a.suburb, a.neighbourhood].filter(Boolean).join('') || data.display_name || '';
        setAddress(full); setLocationName(full);
        if (a.postcode) setPostalCode(a.postcode);
      }
    } catch (err) { console.error('逆ジオコーディング失敗', err); }
  };

  const currentHour = new Date().getHours();
  const current = (weatherData.length > 0 && isToday) ? weatherData[Math.min(currentHour, weatherData.length - 1)] : null;
  const info = current ? getWeatherInfo(current.weatherCode) : null;
  const Icon = info?.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* ===== ヘッダー ===== */}
        <header className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-white/50 space-y-3">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2 mb-3 md:mb-0">
              <MapPin className="text-blue-500" />天気予報ダッシュボード
            </h1>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-600">地域:</label>
              <select value={regionCode} onChange={handleRegionChange}
                className="bg-white border border-gray-300 text-sm rounded-lg w-40 p-2.5 shadow-sm">
                {regionCode === '' && <option value="">カスタム地点</option>}
                {REGIONS.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600 shrink-0">〒</label>
              <input type="text" placeholder="100-0001" value={postalCode}
                onChange={e => setPostalCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePostalCodeSearch()}
                className="bg-white border border-gray-300 text-sm rounded-lg w-36 p-2.5 shadow-sm" />
              <button onClick={handlePostalCodeSearch} className="bg-blue-500 hover:bg-blue-600 text-white p-2.5 rounded-lg shadow-sm transition-colors" title="郵便番号で検索">
                <Search className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <label className="text-sm font-medium text-gray-600 shrink-0">住所</label>
              <input type="text" placeholder="東京都千代田区千代田" value={address}
                onChange={e => setAddress(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddressSearch()}
                className="bg-white border border-gray-300 text-sm rounded-lg w-full p-2.5 shadow-sm" />
              <button onClick={handleAddressSearch} className="bg-blue-500 hover:bg-blue-600 text-white p-2.5 rounded-lg shadow-sm transition-colors" title="住所で検索">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">{error}</div>}

        {/* ===== カレンダー ===== */}
        <ThreeMonthCalendar selectedDate={startDate} onSelect={setStartDate} />

        {/* ===== 現在の天気（今日が起点の場合のみ） ===== */}
        {current && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-5 shadow-lg border border-white/60 flex items-center gap-3">
              <div className="p-2.5 bg-orange-50 rounded-xl"><Thermometer className="text-orange-500 w-7 h-7" /></div>
              <div>
                <p className="text-xs text-gray-500">気温</p>
                <p className="text-2xl font-bold">{current.temperature}<span className="text-sm">°C</span></p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-5 shadow-lg border border-white/60 flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl"><Droplets className="text-blue-500 w-7 h-7" /></div>
              <div>
                <p className="text-xs text-gray-500">湿度</p>
                <p className="text-2xl font-bold">{current.humidity}<span className="text-sm">%</span></p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-5 shadow-lg border border-white/60 flex items-center gap-3">
              <div className={`p-2.5 ${info.bg} rounded-xl`}>{Icon && <Icon className={`w-7 h-7 ${info.color}`} />}</div>
              <div>
                <p className="text-xs text-gray-500">天気</p>
                <p className="text-2xl font-bold">{info.desc}</p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-5 shadow-lg border border-white/60 flex items-center gap-3">
              <div className="p-2.5 bg-teal-50 rounded-xl"><Wind className="text-teal-500 w-7 h-7" /></div>
              <div>
                <p className="text-xs text-gray-500">風速</p>
                <p className="text-2xl font-bold">{current.windSpeed ?? '-'}<span className="text-sm">km/h</span></p>
              </div>
            </div>
          </div>
        )}

        {/* ===== 週間予報カード ===== */}
        {dailyData.length > 0 && (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-5 shadow-xl border border-white/60">
            <h2 className="text-lg font-semibold mb-4">週間予報</h2>
            <div className="grid grid-cols-7 gap-2">
              {dailyData.map((d, i) => {
                const w = getWeatherInfo(d.weatherCode);
                const WIcon = w.icon;
                return (
                  <div key={i} className={`rounded-xl p-3 text-center space-y-1 ${i === 0 ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-semibold ${i === 0 ? 'text-blue-600' : 'text-gray-600'}`}>{getDayLabel(d.date, startDate)}</p>
                    <WIcon className={`w-7 h-7 mx-auto ${w.color}`} />
                    <p className="text-xs text-gray-500">{w.desc}</p>
                    <div className="flex justify-center gap-1 text-sm">
                      <span className="text-red-500 font-bold">{d.tempMax}°</span>
                      <span className="text-gray-400">/</span>
                      <span className="text-blue-500 font-bold">{d.tempMin}°</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                      <Umbrella className="w-3 h-3" />{d.precipProbMax ?? 0}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== 気温・湿度グラフ ===== */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-5 shadow-xl border border-white/60">
          <h2 className="text-lg font-semibold mb-4">7日間の気温・湿度</h2>
          {loading ? (
            <div className="h-72 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-500" />
            </div>
          ) : weatherData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-gray-400">データがありません</div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weatherData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} interval={11} angle={-35} textAnchor="end" height={50} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: '気温(℃)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} label={{ value: '湿度(%)', angle: 90, position: 'insideRight', style: { fontSize: 11 } }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  {isToday && <ReferenceLine x={currentTime} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 3"
                    label={{ value: '現在', position: 'top', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} yAxisId="left" />}
                  <Line yAxisId="left" type="monotone" dataKey="temperature" name="気温(℃)" stroke="#f97316" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                  <Line yAxisId="right" type="monotone" dataKey="humidity" name="湿度(%)" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ===== 降水確率・降水量グラフ ===== */}
        {weatherData.length > 0 && weatherData[0].precipProbability !== null && (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-5 shadow-xl border border-white/60">
            <h2 className="text-lg font-semibold mb-4">降水確率・降水量</h2>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weatherData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} interval={11} angle={-35} textAnchor="end" height={50} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} domain={[0, 100]} label={{ value: '確率(%)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} label={{ value: 'mm', angle: 90, position: 'insideRight', style: { fontSize: 11 } }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  {isToday && <ReferenceLine x={currentTime} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 3" yAxisId="left" />}
                  <Line yAxisId="left" type="monotone" dataKey="precipProbability" name="降水確率(%)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Bar yAxisId="right" dataKey="precipitation" name="降水量(mm)" fill="#93c5fd" opacity={0.6} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ===== 地図 ===== */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-5 shadow-xl border border-white/60">
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <MapPin className="text-blue-500 w-5 h-5" />{locationName}
          </h2>
          <p className="text-xs text-gray-400 mb-3">地図をクリックすると、その地点の天気情報を表示します</p>
          <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 350 }}>
            <MapContainer center={[lat, lon]} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
              <FlyTo center={[lat, lon]} />
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[lat, lon]}><Popup>{locationName}</Popup></Marker>
              <MapEvents onClick={handleMapClick} />
            </MapContainer>
          </div>
        </div>

        {/* ===== クレジット ===== */}
        <footer className="bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/50 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-600 text-sm mb-2">データ出典</p>
          <p>気象データ: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Weather data by Open-Meteo.com</a>（CC-BY 4.0）</p>
          <p>地図データ: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">OpenStreetMap</a> contributors（ODbL）</p>
          <p>住所検索: <a href="https://zipcloud.ibsnet.co.jp/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">zipcloud</a> / <a href="https://nominatim.openstreetmap.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Nominatim</a></p>
        </footer>

      </div>
    </div>
  );
}
