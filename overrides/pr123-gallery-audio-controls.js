/* Experimental preview only: render audio gallery controls like the compact
 * native video overlay, without swapping audio sources or touching downloads.
 * Conversation voice messages keep the existing Meapri voice player. */
(() => {
  'use strict';
  const mounted = new WeakSet();
  const icon = (name) => {
    const paths = {
      play: '<path d="M8 5.5 19 12 8 18.5z" fill="currentColor" stroke="none"/>',
      pause: '<path d="M8 5v14M16 5v14"/>',
      volume: '<path d="M11 5 6 9H3v6h3l5 4zM15 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12"/>',
      muted: '<path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6m0-6-5 6"/>',
      more: '<circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>'
    };
    return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + paths[name] + '</svg>';
  };
  const time = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const s = Math.floor(seconds);
    return s >= 3600
      ? Math.floor(s / 3600) + ':' + String(Math.floor(s / 60) % 60).padStart(2,'0') + ':' + String(s % 60).padStart(2,'0')
      : Math.floor(s / 60) + ':' + String(s % 60).padStart(2,'0');
  };
  function enhance(audio) {
    if (!(audio instanceof HTMLAudioElement) || mounted.has(audio)) return;
    const thumb = audio.closest('.media-card .thumb.audio-thumb');
    const overlay = audio.closest('.audio-player-overlay');
    if (!thumb || !overlay || !thumb.contains(overlay)) return;

    const controls = document.createElement('div');
    controls.className = 'gav-controls';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', '영상 카드와 동일한 형태의 음성 재생 컨트롤');
    controls.innerHTML =
      '<div class="gav-row">' +
        '<button class="gav-btn gav-play" type="button" aria-label="음성 재생">' + icon('play') + '</button>' +
        '<output class="gav-time" aria-live="off" aria-label="현재 재생 시간">0:00</output>' +
        '<span class="gav-spacer" aria-hidden="true"></span>' +
        '<button class="gav-btn gav-mute" type="button" aria-label="음소거">' + icon('volume') + '</button>' +
        '<details class="gav-settings">' +
          '<summary class="gav-btn gav-more" aria-label="음성 재생 설정" title="음성 재생 설정">' + icon('more') + '</summary>' +
          '<div class="gav-menu" role="group" aria-label="음성 설정">' +
            '<label>음량<input class="gav-volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="음성 볼륨"></label>' +
            '<label>재생 속도<select class="gav-rate" aria-label="음성 재생 속도">' +
              '<option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option>' +
            '</select></label>' +
          '</div>' +
        '</details>' +
      '</div>' +
      '<input class="gav-seek" type="range" min="0" max="1" step="0.01" value="0" disabled aria-label="음성 재생 위치">';
    const $ = sel => controls.querySelector(sel);
    const play = $('.gav-play'), mute = $('.gav-mute'), seek = $('.gav-seek');
    const volume = $('.gav-volume'), rate = $('.gav-rate'), settings = $('.gav-settings');
    let dragging = false;
    const render = () => {
      const duration = audio.duration;
      const valid = Number.isFinite(duration) && duration > 0;
      seek.disabled = !valid;
      seek.max = String(valid ? duration : 1);
      if (!dragging) seek.value = String(valid ? Math.min(audio.currentTime, duration) : 0);
      const current = dragging ? Number(seek.value) : audio.currentTime;
      const progress = valid ? Math.min(100, current / duration * 100) : 0;
      seek.style.setProperty('--gav-progress', progress + '%');
      seek.setAttribute('aria-valuetext', time(current) + ' / ' + (valid ? time(duration) : '—'));
      $('.gav-time').textContent = time(current);
      const paused = audio.paused || audio.ended;
      play.innerHTML = icon(paused ? 'play' : 'pause');
      play.setAttribute('aria-label', paused ? '음성 재생' : '음성 일시정지');
      const silenced = audio.muted || audio.volume === 0;
      mute.innerHTML = icon(silenced ? 'muted' : 'volume');
      mute.setAttribute('aria-label', silenced ? '음소거 해제' : '음소거');
      mute.setAttribute('aria-pressed', String(silenced));
      volume.value = String(audio.muted ? 0 : audio.volume);
      rate.value = String(audio.playbackRate);
    };
    const stop = event => event.stopPropagation();
    const toggle = async event => {
      event.preventDefault();
      event.stopPropagation();
      if (audio.paused) {
        try { await audio.play(); }
        catch (error) {
          const note = thumb.querySelector('.audio-error-note');
          if (note) {
            thumb.classList.add('audio-failed');
            note.textContent = '음성을 재생할 수 없습니다. 다운로드는 가능합니다.';
          }
        }
      } else audio.pause();
      render();
    };
    play.addEventListener('click', toggle);
    mute.addEventListener('click', event => {
      event.preventDefault();event.stopPropagation();
      audio.muted = !audio.muted;render();
    });
    seek.addEventListener('pointerdown', () => { dragging = true; });
    seek.addEventListener('input', () => {
      if (!seek.disabled) {
        audio.currentTime = Math.max(0, Number(seek.value));
        render();
      }
    });
    for (const end of ['change','pointerup','pointercancel']) {
      seek.addEventListener(end, () => { dragging = false;render(); });
    }
    volume.addEventListener('input', () => {
      audio.muted = false;
      audio.volume = Number(volume.value);
      render();
    });
    rate.addEventListener('change', () => { audio.playbackRate = Number(rate.value);render(); });
    controls.addEventListener('click', stop);
    controls.addEventListener('dblclick', stop);
    controls.addEventListener('pointerdown', stop);
    settings.addEventListener('keydown', event => {
      if (event.key === 'Escape') { settings.open = false;settings.querySelector('summary').focus();event.stopPropagation(); }
    });
    for (const name of ['loadedmetadata','durationchange','timeupdate','seeking','seeked','play','pause','ended','volumechange','ratechange']) {
      audio.addEventListener(name, render);
    }
    overlay.append(controls);
    thumb.classList.add('gav-ready');
    audio.controls = false;
    audio.tabIndex = -1;
    mounted.add(audio);
    render();
  }
  window.FrommGalleryAudioControls = Object.freeze({enhance});
})();
