import { useEffect, useRef, useState } from 'react';
import type { Reading } from '../lib/tarot';
import { Icon } from './ui';

/** Genera la imagen de historia y la comparte (Instagram desde el menú de compartir del celular) o la descarga. */
export function ShareStory({ reading, name, onClose }: { reading: Reading; name: string; onClose: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');
  const close = useRef(onClose); close.current = onClose;

  useEffect(() => {
    let alive = true, u = '';
    import('../lib/story').then(m => m.makeStory(reading, name)).then(b => { if (!alive) return; u = URL.createObjectURL(b); setBlob(b); setUrl(u); }).catch(() => alive && setMsg('No pude crear la imagen. Intenta otra vez.'));
    const f = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    window.addEventListener('keydown', f);
    return () => { alive = false; window.removeEventListener('keydown', f); if (u) URL.revokeObjectURL(u); };
  }, [reading, name]);

  const file = blob ? new File([blob], `taro-${reading.date}.png`, { type: 'image/png' }) : null;
  const canShare = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  async function share() {
    if (!file) return;
    try { await navigator.share({ files: [file], title: 'Mi tirada en Taro' }); } catch (e) { if ((e as Error).name !== 'AbortError') setMsg('No se pudo abrir el menú de compartir. Descárgala y súbela a tu historia.'); }
  }
  function download() {
    if (!url) return;
    const a = document.createElement('a'); a.href = url; a.download = `taro-${reading.date}.png`; a.click();
  }

  return (
    <div className="sheet-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet share-sheet" role="dialog" aria-modal="true" aria-labelledby="ss-title">
        <span className="sheet-grip" aria-hidden="true" />
        <button className="icon-btn sheet-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
        <h2 id="ss-title" className="sheet-title">Comparte tu tirada</h2>
        <p className="muted">Lista para tu historia de Instagram.</p>
        <div className="story-preview">{url ? <img src={url} alt="Vista previa de la historia con tus cartas" /> : <span className="story-loading"><Icon name="sparkle" size={28} />Preparando tu imagen…</span>}</div>
        <p className="auth-err" aria-live="polite">{msg}</p>
        <div className="sheet-actions">
          <button type="button" className="btn" onClick={download} disabled={!url}><Icon name="download" size={18} />Descargar</button>
          {canShare && <button type="button" className="btn btn-primary btn-ig" onClick={share}><Icon name="insta" size={18} />Compartir en Instagram</button>}
        </div>
        {!canShare && url && <p className="fine share-hint">Descárgala y súbela como historia desde Instagram. En el celular verás el botón para compartir directo.</p>}
      </div>
    </div>
  );
}
