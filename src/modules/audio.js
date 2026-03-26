import { ATHAN_SOURCES, QURAN_CDN } from '../data/surahs.js';

let _ctx = null;
function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

export function playAthanTone(onEnd) {
  const ctx   = getCtx();
  const notes = [523.25,587.33,659.25,698.46,783.99];
  let t = ctx.currentTime;
  for (let rep=0; rep<3; rep++) {
    notes.forEach(freq => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t+0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t+0.8);
      osc.start(t); osc.stop(t+0.85);
      t += 0.5;
    });
    t += 0.3;
  }
  setTimeout(() => { if (onEnd) onEnd(); }, (t - ctx.currentTime)*1000 + 200);
}

export class FallbackAudio {
  constructor(id) {
    this.el       = document.getElementById(id);
    this._urls    = [];
    this._idx     = 0;
    this._synth   = false;
    this._playing = false;
    this._onEnd = this._onLoad = this._onErr = null;

    this.el.addEventListener('ended',         () => { this._playing=false; this._synth=false; this._onEnd?.(); });
    this.el.addEventListener('loadedmetadata',() => { this._onLoad?.(); });
    this.el.addEventListener('error',         () => { this._tryNext(); });
  }

  load(urls) {
    this._urls=urls; this._idx=0; this._synth=false;
    this.el.pause(); this.el.src=urls[0]; this.el.load();
  }

  _tryNext() {
    this._idx++;
    if (this._idx < this._urls.length) {
      this.el.src=this._urls[this._idx]; this.el.load();
      if (this._playing) this.el.play().catch(()=>{});
    } else {
      this._synth=true;
      if (this._playing) playAthanTone(this._onEnd);
      this._onErr?.('synth');
    }
  }

  play() {
    this._playing=true;
    if (this._synth) { playAthanTone(this._onEnd); return Promise.resolve(); }
    return this.el.play().catch(()=>this._tryNext());
  }
  pause()  { this._playing=false; if (!this._synth) this.el.pause(); }
  stop()   { this._playing=false; this._synth=false; this.el.pause(); this.el.currentTime=0; }
  seek(p)  { if (!this._synth && this.el.duration) this.el.currentTime=p*this.el.duration; }

  get currentTime() { return this.el.currentTime; }
  get duration()    { return this.el.duration||0; }
  get paused()      { return this.el.paused; }

  onEnd(fn)  { this._onEnd=fn; }
  onLoad(fn) { this._onLoad=fn; }
  onError(fn){ this._onErr=fn; }
}

export class AthanManager {
  constructor(audio) { this.audio=audio; this.currentIdx=0; this._load(0); }
  _load(i)  { this.currentIdx=i; this.audio.load(ATHAN_SOURCES[i].urls); }
  select(i) { this.audio.stop(); this._load(i); }
  toggle()  { return this.audio.paused ? this.audio.play() : (this.audio.pause(), Promise.resolve()); }
  stop()    { this.audio.stop(); }
  restart() { this.audio.el.currentTime=0; }
  get source() { return ATHAN_SOURCES[this.currentIdx]; }
}

export class QuranManager {
  constructor(audio) { this.audio=audio; this.currentIdx=-1; }
  loadSurah(i) { this.currentIdx=i; this.audio.load([`${QURAN_CDN}${i+1}.mp3`]); return this.audio.play(); }
  toggle()     { if (this.currentIdx<0) return Promise.reject('none');
                 return this.audio.paused ? this.audio.play() : (this.audio.pause(), Promise.resolve()); }
  prev()       { if (this.currentIdx>0)   return this.loadSurah(this.currentIdx-1); }
  next()       { if (this.currentIdx<113) return this.loadSurah(this.currentIdx+1); }
  stop()       { this.audio.stop(); }
}
