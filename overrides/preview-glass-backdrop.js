/* Rasterize the small, visible sample under a pane using the page's own
 * decoded media and solid paint. No asset requests or DOM serialization. */
const unreadable = new WeakMap();
const probe = document.createElement('canvas');
probe.width = probe.height = 1;
const mediaArea = '.replay-thumb,.media-thumb,.media-thumb-wrap,.channel-photo-image,.video-stage';
const overlay = '.morph-menu-skin,.morph-menu-content,#saveResultModal,.preview-webgl-face';

function paintColors(el, cache) {
  if (!cache.has(el)) {
    const style = getComputedStyle(el);
    cache.set(el, {color: style.backgroundColor, opacity: Number(style.opacity), fit: style.objectFit, position: style.objectPosition});
  }
  return cache.get(el);
}

function opaque(color) {
  return color && color !== 'transparent' && !color.startsWith('rgba(') && !color.includes(' / ');
}

function sourceSize(source) {
  if (source instanceof HTMLImageElement) return [source.naturalWidth, source.naturalHeight];
  if (source instanceof HTMLVideoElement) return [source.videoWidth, source.videoHeight];
  return [source.width, source.height];
}

function canSample(source) {
  const [width, height] = sourceSize(source);
  if (!width || !height || source instanceof HTMLVideoElement && (!source.paused || source.readyState < 2)) return false;
  const url = source.currentSrc;
  if (url && unreadable.get(source) === url) return false;
  // A visible image can be drawable and still be unreadable by WebGL. The
  // canvas test follows normal origin/CORS checks without re-fetching it.
  probe.width = 1;
  const context = probe.getContext('2d', {willReadFrequently: true});
  try {
    context.drawImage(source, 0, 0, 1, 1);
    context.getImageData(0, 0, 1, 1);
    return true;
  } catch {
    if (url) unreadable.set(source, url);
    return false;
  }
}

function drawMedia(ctx, source, rect, paint, origin, cell) {
  const [width, height] = sourceSize(source);
  const scaleX = rect.width / width, scaleY = rect.height / height;
  const ratio = paint.fit === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
  const w = paint.fit === 'fill' ? rect.width : width * ratio;
  const h = paint.fit === 'fill' ? rect.height : height * ratio;
  const [px, py] = paint.position.split(' ').map(part => part.endsWith('%') ? Number.parseFloat(part) / 100 : 0.5);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cell.x, cell.y, cell.w, cell.h);
  ctx.clip();
  ctx.drawImage(source, rect.left - origin.x + (rect.width - w) * (px ?? 0.5), rect.top - origin.y + (rect.height - h) * (py ?? 0.5), w, h);
  ctx.restore();
}

function mediaAt(el, x, y, candidates) {
  if (el instanceof HTMLImageElement || el instanceof HTMLVideoElement) return el;
  const area = el.closest(mediaArea);
  if (!area) return null;
  if (!candidates.has(area)) candidates.set(area, [...area.querySelectorAll('img,video')].map(el => ({el, rect: el.getBoundingClientRect()})));
  return candidates.get(area).find(({rect}) => x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom)?.el ?? null;
}

export function captureBackdrop(ctx, surface, origin, width, height) {
  const stage = surface.closest('.glass-settings-preview')?.querySelector('[data-preview-glass-scene]');
  const fallback = getComputedStyle(document.documentElement).getPropertyValue('--theme-bg').trim() || '#eff4f3';
  ctx.fillStyle = fallback;
  ctx.fillRect(0, 0, width, height);
  if (stage?.width > 0 && stage.height > 0) {
    const rect = stage.getBoundingClientRect();
    ctx.drawImage(stage, rect.left - origin.x, rect.top - origin.y, rect.width, rect.height);
    return 'settings';
  }

  const styles = new Map(), media = new Map(), candidates = new Map();
  let type = 'ui';
  const cellSize = Math.max(8, Math.ceil(Math.sqrt(width * height / 120)));
  const owner = surface.parentElement?.closest('button,[role="button"]');
  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      const w = Math.min(cellSize, width - x), h = Math.min(cellSize, height - y);
      const vx = Math.max(0, Math.min(innerWidth - 1, origin.x + x + w / 2));
      const vy = Math.max(0, Math.min(innerHeight - 1, origin.y + y + h / 2));
      for (const el of document.elementsFromPoint(vx, vy)) {
        if (el === surface || surface.contains(el) || el === owner || el.closest(overlay)) continue;
        const paint = paintColors(el, styles);
        if (!paint.opacity) continue;
        const drawable = mediaAt(el, vx, vy, candidates);
        if (drawable) {
          if (!media.has(drawable)) media.set(drawable, {readable: canSample(drawable), rect: drawable.getBoundingClientRect()});
          const {readable, rect} = media.get(drawable);
          if (!readable) return null;
          drawMedia(ctx, drawable, rect, paintColors(drawable, styles), origin, {x, y, w, h});
          type = 'media';
          break;
        }
        if (opaque(paint.color) && paint.opacity === 1) {
          ctx.fillStyle = paint.color;
          ctx.fillRect(x, y, w, h);
          break;
        }
      }
    }
  }
  return type;
}
