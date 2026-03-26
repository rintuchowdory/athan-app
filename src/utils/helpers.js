export const fmtTime = s =>
  (!s || isNaN(s)) ? '—'
  : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

export function updateProgress(fillId, curId, durId, cur, dur) {
  const fill = document.getElementById(fillId);
  if (fill && dur) fill.style.width = ((cur/dur)*100)+'%';
  const c = document.getElementById(curId);
  const d = document.getElementById(durId);
  if (c) c.textContent = fmtTime(cur);
  if (d) d.textContent = fmtTime(dur);
}

let _toastTimer;
export function showToast(msg, duration=2800) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

export const gregDateStr = () =>
  new Date().toLocaleDateString('en-US',
    { weekday:'long', year:'numeric', month:'long', day:'numeric' });
