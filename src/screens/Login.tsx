import { useState } from 'react';
import { auth, repo } from '../lib/repo';
import type { Snapshot } from '../lib/repo';
import { Character } from '../components/Character';
import { BirthForm } from '../components/BirthForm';
import { computeChart, chartToPlacements, type Birth } from '../lib/natal';

const errText = (e: unknown) => {
  const m = e instanceof Error ? e.message : '';
  if (/invalid login/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/not confirmed/i.test(m)) return 'Primero confirma tu correo con el enlace que te enviamos.';
  if (/already registered/i.test(m)) return 'Ese correo ya tiene cuenta. Entra con tu contraseña.';
  if (/rate limit|security purposes/i.test(m)) return 'Demasiados intentos seguidos. Espera un momento.';
  if (/password/i.test(m)) return 'La contraseña debe tener al menos 8 caracteres.';
  return m || 'Algo salió mal. Intenta de nuevo.';
};

export function Login() {
  const [mode, setMode] = useState<'in' | 'up' | 'forgot' | 'link'>('in');
  const [email, setEmail] = useState(''); const [pass, setPass] = useState('');
  const [msg, setMsg] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  const isDiego = /#\/diego/.test(window.location.hash);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(''); setOk('');
    try {
      if (mode === 'in') await auth.signIn(email.trim(), pass);
      else if (mode === 'up') { const r = await auth.signUp(email.trim(), pass); if (r.needsConfirm) setOk(`Te enviamos un correo a ${email.trim()}. Ábrelo para confirmar tu cuenta y vuelve a entrar aquí.`); }
      else if (mode === 'forgot') { await auth.resetPassword(email.trim()); setOk('Si ese correo tiene cuenta, te llegará un enlace para crear una contraseña nueva.'); }
      else { await auth.sendLink(email.trim()); setOk('Te enviamos un enlace de acceso. Ábrelo en este mismo dispositivo.'); }
    } catch (er) { setMsg(errText(er)); }
    setBusy(false);
  }
  const titles = { in: 'Entrar', up: 'Crear cuenta', forgot: 'Recuperar contraseña', link: 'Entrar con enlace' };
  const go = (m: typeof mode) => { setMode(m); setMsg(''); setOk(''); };

  return (
    <div className="auth">
      <div className="auth-card">
        <Character kind="nebula" size={150} className="float" />
        <h1 className="logo-big">Taro</h1>
        <p className="sub">{isDiego ? 'Hola, Diego. Tu bitácora de tarot y cielo te espera.' : 'Tu bitácora de tarot y cielo, para dos.'}</p>
        {(mode === 'in' || mode === 'up') && (
          <div className="seg" role="group" aria-label="Entrar o crear cuenta">
            <button type="button" aria-pressed={mode === 'in'} onClick={() => go('in')}>Entrar</button>
            <button type="button" aria-pressed={mode === 'up'} onClick={() => go('up')}>Crear cuenta</button>
          </div>
        )}
        {(mode === 'forgot' || mode === 'link') && <h2 className="auth-sub">{titles[mode]}</h2>}
        <form onSubmit={submit}>
          <label className="field">Correo<input type="email" name="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
          {(mode === 'in' || mode === 'up') && (
            <label className="field">Contraseña<input type="password" name="password" autoComplete={mode === 'up' ? 'new-password' : 'current-password'} required minLength={mode === 'up' ? 8 : undefined} value={pass} onChange={e => setPass(e.target.value)} /></label>
          )}
          {mode === 'up' && <p className="fine" style={{ marginTop: 6 }}>Mínimo 8 caracteres.</p>}
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Un momento…' : mode === 'in' ? 'Entrar' : mode === 'up' ? 'Crear mi cuenta' : mode === 'forgot' ? 'Enviar enlace' : 'Enviar enlace de acceso'}</button>
        </form>
        <p className="auth-err" aria-live="polite">{msg}</p>
        {ok && <p className="auth-ok" aria-live="polite">{ok}</p>}
        <div className="auth-links">
          {mode === 'in' && <><button type="button" className="link" onClick={() => go('forgot')}>¿Olvidaste tu contraseña?</button><button type="button" className="link" onClick={() => go('link')}>Entrar con un enlace al correo</button></>}
          {(mode === 'forgot' || mode === 'link') && <button type="button" className="link" onClick={() => go('in')}>Volver</button>}
        </div>
        <p className="fine">Tu sesión queda guardada en este navegador hasta que la cierres.</p>
      </div>
    </div>
  );
}

/** Crear una contraseña nueva al volver del enlace de recuperación. */
export function NewPassword({ onDone }: { onDone: () => void }) {
  const [pass, setPass] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('');
    try { await auth.setPassword(pass); onDone(); } catch (er) { setMsg(errText(er)); }
    setBusy(false);
  }
  return (
    <div className="auth"><div className="auth-card">
      <Character kind="star" size={140} className="float" />
      <h1 className="h-display">Crea tu contraseña</h1>
      <form onSubmit={submit}>
        <label className="field">Contraseña nueva<input type="password" autoComplete="new-password" minLength={8} required value={pass} onChange={e => setPass(e.target.value)} /></label>
        <button className="btn btn-primary btn-block" disabled={busy}>Guardar y entrar</button>
      </form>
      <p className="auth-err" aria-live="polite">{msg}</p>
    </div></div>
  );
}

const ACCENTS = [['#B58CE7', 'Lavanda'], ['#69CDA6', 'Menta'], ['#F5A9CE', 'Rosa'], ['#94BFF2', 'Cielo'], ['#F7AC87', 'Durazno']];

export function Onboarding({ snap, onDone }: { snap: Snapshot; onDone: () => void }) {
  const me = snap.me, myMeta = snap.myMeta;
  const isDiego = /#\/diego/.test(window.location.hash);
  const [name, setName] = useState(isDiego ? 'Diego' : ''); const [handle, setHandle] = useState(isDiego ? 'diego' : '');
  const [accent, setAccent] = useState(isDiego ? ACCENTS[1][0] : ACCENTS[0][0]);
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
  const step: 'profile' | 'birth' = !me ? 'profile' : 'birth';

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('');
    try { await auth.createProfile({ display_name: name.trim(), handle: handle || slug(name), accent }); onDone(); }
    catch (er) { setMsg(er instanceof Error && /duplicate|unique/i.test(er.message) ? 'Ese nombre de usuario ya existe, prueba otro.' : 'No se pudo crear el perfil.'); }
    setBusy(false);
  }
  async function saveBirth(b: Birth | null) {
    setBusy(true); setMsg('');
    try {
      if (b) { await repo.saveProfile({ natal: chartToPlacements(computeChart(b)) }); await repo.saveMyMeta({ ...myMeta, birth: b }); }
      else await repo.saveMyMeta({ ...myMeta, birth_skipped: true });
      onDone();
    } catch { setMsg('No se pudo guardar.'); }
    setBusy(false);
  }
  return (
    <div className="auth">
      <div className="auth-card">
        <ol className="steps" aria-label="Pasos">{['Perfil', 'Nacimiento'].map((s, i) => <li key={s} aria-current={['profile', 'birth'][i] === step ? 'step' : undefined}>{s}</li>)}</ol>
        <Character kind={step === 'profile' ? 'star' : 'sun'} size={130} className="float" />
        {step === 'profile' && (
          <form onSubmit={saveProfile}>
            <h1 className="h-display">Hola, ¿quién eres?</h1>
            <label className="field">Nombre<input required value={name} onChange={e => { setName(e.target.value); setHandle(slug(e.target.value)); }} /></label>
            <label className="field">Usuario para tu link<input required pattern="[a-z0-9-]{2,24}" value={handle} onChange={e => setHandle(slug(e.target.value))} /></label>
            <fieldset className="field accents"><legend>Tu color</legend>
              {ACCENTS.map(([c, n]) => <button type="button" key={c} className="accent-dot" style={{ background: c }} aria-pressed={accent === c} aria-label={n} onClick={() => setAccent(c)} />)}
            </fieldset>
            <button className="btn btn-primary btn-block" disabled={busy}>Continuar</button>
          </form>
        )}
        {step === 'birth' && (
          <div className="auth-form">
            <h1 className="h-display">¿Cuándo naciste?</h1>
            <p className="sub" style={{ textAlign: 'center' }}>Con tu fecha, hora y lugar calculamos tu carta natal y tus casas.</p>
            <BirthForm busy={busy} onSave={saveBirth} onSkip={() => saveBirth(null)} />
          </div>
        )}
        <p className="auth-err" aria-live="polite">{msg}</p>
      </div>
    </div>
  );
}
