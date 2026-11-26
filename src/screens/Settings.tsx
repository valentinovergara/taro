import { useState } from 'react';
import type { Ctx } from '../App';
import { repo, auth } from '../lib/repo';
import { Icon, Avatar } from '../components/ui';

export function Settings({ ctx }: { ctx: Ctx }) {
  const me = ctx.snap.me!;
  const [name, setName] = useState(me.display_name);
  const [tags, setTags] = useState(me.tags.join(', '));
  const [love, setLove] = useState(ctx.snap.myMeta.love || '');
  const [studio, setStudio] = useState(ctx.snap.myMeta.studio || '');
  const [context, setContext] = useState(ctx.snap.context);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState('');
  const [pw, setPw] = useState(''); const [pwMsg, setPwMsg] = useState('');
  const base = window.location.origin + window.location.pathname;

  async function save() {
    try {
      await repo.saveProfile({ display_name: name.trim() || me.display_name, tags: tags.split(',').map(t => t.trim()).filter(Boolean) });
      await repo.saveMyMeta({ ...ctx.snap.myMeta, love: love.trim(), studio: studio.trim() });
      await repo.saveContext(context);
      await ctx.refresh(); setMsg('Guardado.');
    } catch { setMsg('No se pudo guardar.'); }
  }
  async function savePw(e: React.FormEvent) {
    e.preventDefault(); setPwMsg('');
    if (pw.length < 8) { setPwMsg('Mínimo 8 caracteres.'); return; }
    try { await auth.setPassword(pw); setPw(''); setPwMsg('Contraseña guardada. Ya puedes entrar con tu correo y esta contraseña.'); } catch { setPwMsg('No se pudo guardar la contraseña.'); }
  }
  const copy = async (text: string, key: string) => { try { await navigator.clipboard.writeText(text); setCopied(key); } catch { setCopied(''); } };

  return (
    <div className="screen settings">
      <header><p className="eyebrow">Ajustes</p><h1 className="h-display">Tu perfil</h1></header>
      <div className="settings-grid">
        <section className="panel">
          <div className="me-row"><Avatar name={me.display_name} accent={me.accent} size={52} /><div><b>{me.display_name}</b><p className="fine">taro/#/{me.handle}</p></div></div>
          <label className="field">Nombre<input value={name} onChange={e => setName(e.target.value)} /></label>
          <label className="field">Temas de pregunta (separados por coma)<input value={tags} onChange={e => setTags(e.target.value)} /></label>
          <label className="field">¿Con quién preguntas en el amor? <span className="fine">Personaliza el consejo del mes</span><input value={love} onChange={e => setLove(e.target.value)} /></label>
          <label className="field">Proyecto propio o estudio<input value={studio} onChange={e => setStudio(e.target.value)} /></label>
          <label className="field">Contexto privado para la lectura profunda <span className="fine">Solo tú lo ves</span><textarea rows={5} value={context} onChange={e => setContext(e.target.value)} /></label>
          <button className="btn btn-primary" onClick={save}>Guardar</button> <span className="fine" aria-live="polite">{msg}</span>
        </section>
        <section className="panel">
          <h3>Amigos</h3>
          <p className="muted">{ctx.snap.friendships.filter(f => f.status === 'accepted').length} amigos en Taro.</p>
          <button className="btn btn-ghost btn-sm" onClick={() => ctx.go('amigos', me.handle)}><Icon name="users" size={18} />Ver y agregar amigos</button>
          <h3 style={{ marginTop: 24 }}>Tu link de invitación</h3>
          <div className="link-row"><code>{base}#/agregar/{me.handle}</code><button className="icon-btn" aria-label="Copiar link de invitación" onClick={() => copy(`${base}#/agregar/${me.handle}`, 'inv')}><Icon name={copied === 'inv' ? 'sparkle' : 'link'} size={18} /></button></div>
          <p className="fine">Quien lo abra crea su cuenta y te puede agregar de una vez.</p>
          <h3 style={{ marginTop: 24 }}>Privacidad</h3>
          <p className="muted">Cada tirada se comparte con tus amigos, a menos que la marques como "Solo para mí" al guardarla. También puedes compartir las cartas y dejar la nota solo para ti.</p>
          <h3 style={{ marginTop: 24 }}>Carta natal</h3>
          <p className="muted">{ctx.snap.myMeta.birth ? `${ctx.snap.myMeta.birth.date}${ctx.snap.myMeta.birth.time ? ' · ' + ctx.snap.myMeta.birth.time : ''} · ${ctx.snap.myMeta.birth.place}` : 'Aún no registras tu fecha, hora y lugar de nacimiento.'}</p>
          <button className="btn btn-ghost btn-sm" onClick={() => ctx.go('carta', me.handle)}><Icon name="chart" size={18} />{ctx.snap.myMeta.birth ? 'Ver o editar mi carta' : 'Calcular mi carta natal'}</button>
          {repo.mode === 'live' && <>
            <h3 style={{ marginTop: 24 }}>Contraseña</h3>
            <form onSubmit={savePw} className="pw-form">
              <input type="text" name="username" autoComplete="username" value={me.handle} readOnly hidden />
              <label className="field">Nueva contraseña<input type="password" autoComplete="new-password" minLength={8} value={pw} onChange={e => setPw(e.target.value)} /></label>
              <button className="btn btn-sm">Guardar contraseña</button>
              <p className="fine" aria-live="polite">{pwMsg}</p>
            </form>
            <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => auth.signOut()}><Icon name="out" size={18} />Cerrar sesión</button>
          </>}
        </section>
      </div>
    </div>
  );
}
