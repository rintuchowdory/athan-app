export async function fetchQibla(lat, lon) {
  const res  = await fetch(`https://api.aladhan.com/v1/qibla/${lat}/${lon}`);
  const json = await res.json();
  if (!res.ok || json.code !== 200) throw new Error('Qibla API error');
  return json.data.direction;
}

export function getUserLocation() {
  return new Promise(resolve => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        ()  => resolve(null)
      );
    } else resolve(null);
  });
}
