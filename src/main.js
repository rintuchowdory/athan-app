import './style.css';
import { SURAHS, PRAYER_NAMES, ATHAN_SOURCES } from './data/surahs.js';
import { fetchPrayerTimes, getNextPrayer }      from './modules/prayers.js';
import { FallbackAudio, AthanManager, QuranManager } from './modules/audio.js';
import { fetchQibla, getUserLocation }           from './modules/qibla.js';
import { fmtTime, updateProgress, showToast, gregDateStr } from './utils/helpers.js';

let timings=null, cityName='Cologne', countryName='Germany';
let userLat=50.938361, userLon=6.959974, qiblaAngle=0;
let athanMgr, quranMgr;

window.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('greg-date').textContent = gregDateStr();

  const athanAudio = new FallbackAudio('athan-audio');
  const quranAudio = new FallbackAudio('quran-audio');
  athanMgr = new AthanManager(athanAudio);
  quranMgr = new QuranManager(quranAudio);

  athanAudio.onEnd(()  => syncAthanUI(false));
  athanAudio.onError(m => { if(m==='synth') showToast('⚠️ CDN unavailable — playing synthesized tone'); });
  athanAudio.el.addEventListener('timeupdate', () =>
    updateProgress('athan-fill','athan-cur','athan-dur', athanAudio.currentTime, athanAudio.duration));

  quranAudio.onEnd(() => { quranMgr.next(); updateQuranUI(); });
  quranAudio.el.addEventListener('timeupdate', () =>
    updateProgress('quran-fill','quran-cur','quran-dur', quranAudio.currentTime, quranAudio.duration));

  await loadPrayerTimes();
  renderSurahs(SURAHS);
  setInterval(tickCountdown, 1000);
  getUserLocation().then(l => { if(l){ userLat=l.lat; userLon=l.lon; } });

  // Athan cards
  document.querySelectorAll('.athan-card').forEach((el,i) => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.athan-card').forEach(c=>c.classList.remove('selected'));
      el.classList.add('selected');
      athanMgr.select(i);
      const s=ATHAN_SOURCES[i];
      document.getElementById('athan-pl-title').textContent = s.name;
      document.getElementById('athan-pl-sub').textContent   = s.place+' — اذان';
      document.getElementById('athan-fill').style.width='0%';
      document.getElementById('athan-cur').textContent='0:00';
      document.getElementById('athan-dur').textContent='—';
      syncAthanUI(false);
    });
  });

  document.getElementById('hero-btn').addEventListener('click', () => {
    athanMgr.toggle().then(() => syncAthanUI());
  });
  document.getElementById('athan-pp').addEventListener('click', () => {
    athanMgr.toggle().then(() => syncAthanUI());
  });
  document.getElementById('athan-restart').addEventListener('click', () => athanMgr.restart());
  document.getElementById('athan-stop').addEventListener('click',    () => { athanMgr.stop(); syncAthanUI(false); });

  document.getElementById('quran-pp').addEventListener('click', () => {
    if(quranMgr.currentIdx<0){ showToast('Select a surah first'); return; }
    quranMgr.toggle();
    document.getElementById('quran-pp').textContent = quranAudio.paused ? '▶' : '⏸';
  });
  document.getElementById('quran-prev').addEventListener('click', () => { quranMgr.prev(); updateQuranUI(); });
  document.getElementById('quran-next').addEventListener('click', () => { quranMgr.next(); updateQuranUI(); });

  document.getElementById('athan-bar').addEventListener('click', e =>
    athanMgr.audio.seek(e.offsetX/e.currentTarget.clientWidth));
  document.getElementById('quran-bar').addEventListener('click', e =>
    quranMgr.audio.seek(e.offsetX/e.currentTarget.clientWidth));

  window.showPanel    = showPanel;
  window.applyCity    = applyCity;
  window.loadQibla    = loadQibla;
  window.filterSurahs = filterSurahs;
});

async function loadPrayerTimes() {
  document.getElementById('prayer-list').innerHTML =
    '<div class="loading"><div class="spin"></div>Loading prayer times…</div>';
  const method = document.getElementById('method-sel').value;
  try {
    const d = await fetchPrayerTimes(cityName, countryName, method);
    timings = d.timings;
    const h = d.hijriDate;
    document.getElementById('hijri-date').textContent = `${h.day} ${h.month.en} ${h.year} AH`;
    document.getElementById('city-name').textContent  = cityName;
    renderPrayerList();
    tickCountdown();
  } catch(e) {
    document.getElementById('prayer-list').innerHTML =
      `<div class="loading">⚠️ Could not load prayer times.<br><small>${e.message}</small></div>`;
  }
}

function renderPrayerList() {
  const next = getNextPrayer(timings);
  const list  = document.getElementById('prayer-list');
  const extra = document.getElementById('extra-list');
  list.innerHTML = ''; extra.innerHTML = '';

  PRAYER_NAMES.forEach(p => {
    const time = timings[p.key]; if(!time) return;
    const curr = next && next.key===p.key;
    const div  = document.createElement('div');
    div.className = 'prayer-item'+(curr?' current':'');
    div.innerHTML = `<div class="p-dot"></div>
      <div class="p-info"><div class="p-en">${p.en}</div><div class="p-ar">${p.ar}</div></div>
      <div class="p-time">${time}</div>
      <button class="p-play">▶</button>`;
    div.querySelector('.p-play').addEventListener('click', () => {
      athanMgr.audio.play().catch(()=>{});
      syncAthanUI(true);
      showToast(`▶ Athan for ${p.en}`);
    });
    list.appendChild(div);
  });

  const extras={Midnight:'Midnight',Firstthird:'First Third of Night',Lastthird:'Last Third of Night'};
  Object.entries(extras).forEach(([k,label]) => {
    if(!timings[k]) return;
    const div=document.createElement('div');
    div.className='prayer-item';
    div.innerHTML=`<div class="p-dot"></div><div class="p-info"><div class="p-en">${label}</div></div><div class="p-time">${timings[k]}</div>`;
    extra.appendChild(div);
  });
}

function tickCountdown() {
  if(!timings) return;
  const next=getNextPrayer(timings); if(!next) return;
  document.getElementById('next-name').textContent = next.en;
  document.getElementById('next-ar').textContent   = next.ar;
  const now=new Date();
  const [h,m]=next.timeStr.split(':').map(Number);
  const tgt=new Date(now); tgt.setHours(h,m,0,0);
  if(tgt<=now) tgt.setDate(tgt.getDate()+1);
  const diff=Math.max(0,Math.floor((tgt-now)/1000));
  document.getElementById('countdown').textContent =
    [Math.floor(diff/3600), Math.floor((diff%3600)/60), diff%60]
    .map(n=>String(n).padStart(2,'0')).join(':');
}

function syncAthanUI(playing) {
  const p = playing!==undefined ? playing : !athanMgr.audio.paused;
  document.getElementById('athan-pp').textContent  = p?'⏸':'▶';
  document.getElementById('hero-icon').textContent = p?'⏸':'▶';
  document.getElementById('hero-btn').classList.toggle('playing', p);
}

function playSurah(idx) {
  quranMgr.loadSurah(idx).catch(()=>showToast('⚠️ Audio unavailable'));
  updateQuranUI();
  showToast(`▶ ${SURAHS[idx][0]}`);
}

function updateQuranUI() {
  const idx=quranMgr.currentIdx; if(idx<0) return;
  const s=SURAHS[idx];
  document.getElementById('quran-pl-title').textContent = `${idx+1}. ${s[0]}`;
  document.getElementById('quran-pl-sub').textContent   = `${s[1]} · ${s[3]} · ${s[2]} verses`;
  document.getElementById('quran-pp').textContent='⏸';
  renderSurahs(SURAHS);
}

function renderSurahs(list) {
  const c=document.getElementById('surah-list'); c.innerHTML='';
  list.forEach(s => {
    const idx=SURAHS.indexOf(s), num=idx+1;
    const playing=idx===quranMgr?.currentIdx;
    const div=document.createElement('div');
    div.className='surah-item'+(playing?' playing':'');
    div.innerHTML=`<div class="s-num">${num}</div>
      <div class="s-info"><div class="s-en">${s[0]}</div><div class="s-meta">${s[3]} · ${s[2]} verses</div></div>
      <div class="s-ar">${s[1]}</div>${playing?'<span class="s-anim">♪</span>':''}`;
    div.addEventListener('click',()=>playSurah(idx));
    c.appendChild(div);
  });
}

function filterSurahs(q) {
  renderSurahs(SURAHS.filter((s,i)=>
    s[0].toLowerCase().includes(q.toLowerCase()) || s[1].includes(q) || String(i+1).includes(q)));
}

async function loadQibla() {
  document.getElementById('qibla-status').textContent='Calculating…';
  try {
    qiblaAngle = await fetchQibla(userLat, userLon);
    document.getElementById('qibla-deg').textContent = qiblaAngle.toFixed(1)+'°';
    document.getElementById('qibla-needle').style.transform=`rotate(${qiblaAngle}deg)`;
    document.getElementById('qibla-status').textContent='✓ Direction found';
    document.getElementById('qibla-loc').textContent=`${userLat.toFixed(4)}°, ${userLon.toFixed(4)}°`;
    document.getElementById('kaaba-ic').style.display='block';
  } catch { document.getElementById('qibla-status').textContent='⚠️ Could not calculate'; }
}

function applyCity() {
  cityName    = document.getElementById('city-in').value.trim()||'Cologne';
  countryName = document.getElementById('country-in').value;
  loadPrayerTimes(); showPanel('prayers'); showToast('📍 '+cityName);
}

function showPanel(id) {
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('panel-'+id).classList.add('active');
  const order=['prayers','athan','quran','qibla','settings'];
  document.querySelectorAll('.tab')[order.indexOf(id)]?.classList.add('active');
  if(id==='qibla'&&qiblaAngle===0) loadQibla();
}
