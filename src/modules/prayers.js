import { PRAYER_NAMES } from '../data/surahs.js';

export async function fetchPrayerTimes(city, country, method=2) {
  const url = `https://api.aladhan.com/v1/timingsByCity`
    + `?city=${encodeURIComponent(city)}`
    + `&country=${encodeURIComponent(country)}`
    + `&method=${method}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.data || 'API error');
  return { timings: json.data.timings, hijriDate: json.data.date.hijri };
}

export function getNextPrayer(timings) {
  if (!timings) return null;
  const now  = new Date();
  const nowM = now.getHours()*60 + now.getMinutes();
  for (const p of PRAYER_NAMES) {
    if (p.key === 'Sunrise') continue;
    const t = timings[p.key]; if (!t) continue;
    const [h,m] = t.split(':').map(Number);
    if (h*60+m > nowM) return { ...p, timeStr:t };
  }
  const fajr = timings['Fajr'];
  return fajr ? { ...PRAYER_NAMES[0], timeStr:fajr } : null;
}
