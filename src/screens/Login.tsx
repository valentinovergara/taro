import { useState } from 'react';
import { auth } from '../lib/repo';
import type { Snapshot } from '../lib/repo';
import { Character } from '../components/Character';

export function Login() {
  const [email, setEmail] = useState(''); const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email'); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('');
    try { await auth.sendLink(email.trim()); setStep('code'); } catch (er) { setMsg(er instanceof Error ? er.message : 'No se pudo enviar.'); }
    setBusy(false);
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('');
    try { await auth.verifyCode(email.trim(), code.trim()); } catch { setMsg('Código incorrecto o vencido.'); }
    setBusy(false);
  }
  return (
    <div className="auth">
      <div className="auth-card">
        <Character kind="nebula" size={170} className="float" />
        <h1 className="logo-big">Taro</h1>
        <p className="sub">Tu bitácora de tarot y cielo, para dos.</p>
        {step === 'email' ? (
          <form onSubmit={send}>
            <label className="field">Tu correo<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Enviando…' : 'Entrar con mi correo'}</button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <p>Te enviamos un enlace y un código a <b>{email}</b>. Abre el enlace o escribe el código aquí.</p>
            <label className="field">Código<input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} /></label>
            <button className="btn btn-primary btn-block" disabled={busy || !code}>Entrar</button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setStep('email')}>Usar otro correo</button>
          </form>
        )}
        <p className="fine" aria-live="polite">{msg}</p>
      </div>
    </div>
  );
}

const ACCENTS = [['#B58CE7', 'Lavanda'], ['#69CDA6', 'Menta'], ['#F5A9CE', 'Rosa'], ['#94BFF2', 'Cielo'], ['#F7AC87', 'Durazno']];

export function Onboarding({ snap, onDone }: { snap: Snapshot; onDone: () => void }) {
  const hasProfile = !!snap.me;
  const [name, setName] = useState(''); const [handle, setHandle] = useState(''); const [accent, setAccent] = useState(ACCENTS[0][0]);
  const [mode, setMode] = useState<'create' | 'join'>('join'); const [circleName, setCircleName] = useState(''); const [code, setCode] = useState('');
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('');
    try { await auth.createProfile({ display_name: name.trim(), handle: handle || slug(name), accent }); onDone(); }
    catch (er) { setMsg(er instanceof Error && /duplicate|unique/i.test(er.message) ? 'Ese nombre de usuario ya existe, prueba otro.' : 'No se pudo crear el perfil.'); }
    setBusy(false);
  }
  async function circle(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('');
    try { if (mode === 'create') await auth.createCircle(circleName.trim()); else await auth.joinCircle(code); onDone(); }
    catch { setMsg(mode === 'join' ? 'Código no válido.' : 'No se pudo crear el círculo.'); }
    setBusy(false);
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <Character kind={hasProfile ? 'planet' : 'star'} size={150} className="float" />
        {!hasProfile ? (
          <form onSubmit={saveProfile}>
            <h1 className="h-display">Hola, ¿quién eres?</h1>
            <label className="field">Nombre<input required value={name} onChange={e => { setName(e.target.value); setHandle(slug(e.target.value)); }} /></label>
            <label className="field">Usuario para tu link<input required pattern="[a-z0-9-]{2,24}" value={handle} onChange={e => setHandle(slug(e.target.value))} /></label>
            <fieldset className="field accents"><legend>Tu color</legend>
              {ACCENTS.map(([c, n]) => <button type="button" key={c} className="accent-dot" style={{ background: c }} aria-pressed={accent === c} aria-label={n} onClick={() => setAccent(c)} />)}
            </fieldset>
            <button className="btn btn-primary btn-block" disabled={busy}>Continuar</button>
          </form>
        ) : (
          <form onSubmit={circle}>
            <h1 className="h-display">Tu círculo</h1>
            <p className="sub">El círculo es el grupo con quien compartes tiradas.</p>
            <div className="seg" role="group">
              <button type="button" aria-pressed={mode === 'join'} onClick={() => setMode('join')}>Tengo un código</button>
              <button type="button" aria-pressed={mode === 'create'} onClick={() => setMode('create')}>Crear uno nuevo</button>
            </div>
            {mode === 'join'
              ? <label className="field">Código de invitación<input required value={code} onChange={e => setCode(e.target.value.toUpperCase())} /></label>
              : <label className="field">Nombre del círculo<input value={circleName} placeholder="Valentino y Diego" onChange={e => setCircleName(e.target.value)} /></label>}
            <button className="btn btn-primary btn-block" disabled={busy}>{mode === 'join' ? 'Unirme' : 'Crear círculo'}</button>
          </form>
        )}
        <p className="fine" aria-live="polite">{msg}</p>
      </div>
    </div>
  );
}
