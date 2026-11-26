import { CARDS, SUITS, posOf, validCards, type CardDef, type Reading, type Suit } from './tarot';

/** [energía general, en el amor, en el trabajo, en lo personal] — tono cercano, de tú. */
type M = [string, string, string, string];

const MAJ: M[] = [
  ['Energía de comienzo puro: saltar con curiosidad aunque no tengas todo resuelto.', 'Ábrete a algo nuevo sin cargar historias viejas.', 'Un camino distinto te llama; empiézalo aunque sea en pequeño.', 'Date permiso de jugar y probar; no todo tiene que salir perfecto.'],
  ['Voluntad y talento en acción: ya tienes los recursos, solo falta usarlos.', 'Di lo que quieres con claridad; tu palabra crea.', 'Es momento de mostrar lo que sabes hacer y lanzarte.', 'Confía en tus habilidades: ya tienes lo que necesitas.'],
  ['Saber interno, silencio y misterio: la respuesta está dentro de ti.', 'No fuerces la conversación; escucha lo que no se dice.', 'Investiga y guarda información antes de moverte.', 'Tu intuición tiene la razón; dale espacio y silencio.'],
  ['Abundancia, placer y creación: lo que cuidas, florece.', 'Ternura, sensualidad y cuidado mutuo.', 'Lo que sembraste crece; nútrelo con cariño.', 'Consiéntete, vuelve a tu cuerpo y a lo bello.'],
  ['Estructura, límites y autoridad: poner orden para poder sostener.', 'Acuerdos claros y estabilidad; ojo con querer controlarlo todo.', 'Organiza, lidera y define las reglas del juego.', 'Poner límites también es una forma de quererte.'],
  ['Tradición, enseñanza y compromiso: lo aprendido y lo sagrado.', 'Compromisos y valores compartidos; lo que se formaliza.', 'Aprende de alguien con experiencia o sigue un método probado.', 'Revisa qué creencias son tuyas y cuáles heredaste.'],
  ['Elegir desde tus valores; unión y vínculo profundo.', 'Conexión fuerte y una decisión importante en pareja.', 'Alianzas que funcionan si van con quien eres.', 'Escoge desde el corazón, no desde el miedo.'],
  ['Determinación y avance: llevar fuerzas opuestas hacia una meta.', 'Avanzar juntos con un rumbo claro.', 'Impulso y logros si mantienes el foco.', 'Tú llevas las riendas; decide hacia dónde vas.'],
  ['Coraje suave: domar el instinto con ternura y paciencia.', 'La paciencia y la compasión fortalecen el vínculo.', 'Firmeza tranquila frente a la presión.', 'Tu fuerza está en la calma, no en empujar.'],
  ['Introspección y búsqueda interior: apartarte para ver claro.', 'Quizá necesitas espacio para saber qué sientes.', 'Profundiza, estudia, trabaja en silencio.', 'Regálate tiempo a solas para escucharte.'],
  ['Ciclos y giros de suerte: algo se está moviendo.', 'Un giro en la relación; acompáñalo sin aferrarte.', 'Llegan oportunidades inesperadas; aprovecha el momento.', 'Lo que sube y baja es parte del camino.'],
  ['Verdad, equilibrio y consecuencias: cosechas lo que siembras.', 'Honestidad y reciprocidad: que cada quien dé lo justo.', 'Decisiones, contratos y temas legales se aclaran.', 'Sé honesto contigo sobre lo que pasó.'],
  ['Pausa, rendición y una nueva mirada: soltar para entender.', 'Espera sin forzar; mira la relación desde otro ángulo.', 'Proyecto en pausa: usa el tiempo para replantearlo.', 'Lo que parece estancamiento es preparación.'],
  ['Transformación y cierre: algo termina para que nazca lo nuevo.', 'Fin de una etapa o de una forma de relacionarte.', 'Cierre de ciclo; deja ir lo que ya no funciona.', 'Suelta una versión vieja de ti.'],
  ['Equilibrio, paciencia y la mezcla justa: sanar despacio.', 'Armonía y acuerdos a fuego lento.', 'Integra, combina y no te apures.', 'Cuida tu energía: el punto medio te sana.'],
  ['Apego, deseo y patrones que atan: mirar tu sombra.', 'Pasión intensa o dependencia; distingue cuál es cuál.', 'Ojo con trabajar solo por miedo o por obligación.', 'Nombra el hábito que te ata para poder soltarlo.'],
  ['Ruptura repentina y revelación: cae lo que no tenía bases.', 'Una verdad sale a la luz y sacude todo.', 'Un cambio brusco que termina despejando el camino.', 'Lo que se derrumba también te libera.'],
  ['Esperanza, sanación y fe después de la tormenta.', 'Vuelven la ternura y la confianza.', 'Inspiración y visión a largo plazo.', 'Algo en ti está sanando; confía.'],
  ['Intuición, sueños e incertidumbre: no todo es lo que parece.', 'Dudas o fantasías; espera a ver claro.', 'La información está incompleta; no decidas todavía.', 'Escucha tus sueños, pero no alimentes tus miedos.'],
  ['Alegría, claridad y vitalidad: todo se ilumina.', 'Felicidad sencilla, calidez y juego.', 'Éxito visible y reconocimiento.', 'Muéstrate tal como eres; tu luz suma.'],
  ['Despertar y llamado: revisar el camino y renacer.', 'Una segunda oportunidad o una decisión definitiva.', 'Tu vocación te está llamando; respóndele.', 'Perdónate y elige quién quieres ser ahora.'],
  ['Culminación y plenitud: un ciclo se completa.', 'Relación plena, o un cierre que se siente completo.', 'Meta alcanzada; celébrala antes de seguir.', 'Integra lo vivido: estás donde tienes que estar.'],
];

const MIN: Record<Exclude<Suit, 'mayor'>, M[]> = {
  copas: [
    ['Un amor o una emoción nueva que desborda: el corazón se abre.', 'Inicio afectivo y ternura disponible.', 'Algo que te apasiona; trabajo con sentido.', 'Abre espacio para sentir.'],
    ['Unión, reciprocidad y atracción mutua.', 'Conexión de igual a igual.', 'Una buena alianza o colaboración.', 'Relaciones que se equilibran.'],
    ['Celebración, amistad y comunidad.', 'Alegría compartida; ojo con terceros.', 'Trabajo en equipo que fluye.', 'Rodéate de tu gente.'],
    ['Apatía e introspección: no ves lo que te están ofreciendo.', 'Desgano o aburrimiento; revisa qué falta.', 'Desmotivación; una oportunidad pasa de lado.', 'Mira lo que sí tienes.'],
    ['Pérdida y duelo: lloras lo que se fue, pero aún queda algo.', 'Tristeza o decepción; no todo está perdido.', 'Un revés del que puedes aprender.', 'Date permiso de sentir el duelo.'],
    ['Nostalgia, ternura y recuerdos de infancia.', 'Reencuentro o cariño inocente.', 'Volver a algo conocido que te hace bien.', 'Recuerda lo que te hacía feliz.'],
    ['Muchas opciones e ilusiones: fantasía contra realidad.', 'Cuidado con idealizar; aterriza lo que deseas.', 'Demasiadas opciones: elige una.', 'Distingue el sueño del plan.'],
    ['Partir en busca de algo más profundo.', 'Alejarte de lo que ya no te llena.', 'Dejar un camino que perdió sentido.', 'Busca lo que de verdad te nutre.'],
    ['Satisfacción: el deseo cumplido.', 'Disfrute y placer.', 'Logros que te llenan de orgullo.', 'Permítete disfrutar sin culpa.'],
    ['Plenitud emocional y armonía en casa.', 'Amor estable y felicidad compartida.', 'Equilibrio entre la vida y el trabajo.', 'Lo que construiste con amor.'],
    ['Un mensaje del corazón: sensibilidad y curiosidad emocional.', 'Un mensaje o un coqueteo nuevo.', 'Una idea creativa que está naciendo.', 'Escucha a tu niño interior.'],
    ['Romanticismo y propuestas: seguir al corazón.', 'Una propuesta romántica o una invitación.', 'Una oferta atractiva; revisa que sea real.', 'Actúa desde lo que sientes.'],
    ['Empatía, intuición y cuidado emocional maduro.', 'Amor compasivo y presente.', 'Liderar con sensibilidad.', 'Cuídate como cuidas a los demás.'],
    ['Equilibrio emocional y sabiduría del corazón.', 'Estabilidad afectiva y madurez.', 'Calma bajo presión y diplomacia.', 'Siente sin dejar que te arrastre.'],
  ],
  pentaculos: [
    ['Una oportunidad concreta: dinero, salud o un proyecto real.', 'Algo estable que puede crecer.', 'Una oferta nueva o un inicio sólido.', 'Siembra algo tangible.'],
    ['Equilibrio y malabares entre prioridades.', 'Adaptarse juntos a los cambios.', 'Muchas tareas a la vez: organízate.', 'Flexibilidad sin perder tu centro.'],
    ['Colaboración, oficio y trabajo bien hecho.', 'Construir juntos, paso a paso.', 'Tu talento brilla en equipo.', 'Aprende de otros.'],
    ['Seguridad y control: aferrarse a lo que se tiene.', 'Posesividad o miedo a perder.', 'Bien ahorrar; mal cerrarte.', 'Suelta un poco el control.'],
    ['Escasez y sensación de quedar por fuera; la ayuda está cerca.', 'Te sientes solo; pide apoyo.', 'Una dificultad económica pasajera.', 'No tienes que pasarlo solo.'],
    ['Generosidad: dar y recibir.', 'Equilibrio en lo que cada uno da.', 'Llega un apoyo, un pago o una ayuda.', 'Comparte y deja que te ayuden.'],
    ['Paciencia y evaluación: la cosecha tarda.', 'Una relación que necesita tiempo.', 'Revisa avances y espera resultados.', 'Lo que sembraste está creciendo.'],
    ['Dedicación, práctica y maestría.', 'Cuidar la relación día a día.', 'Enfócate en perfeccionar tu oficio.', 'La constancia te vuelve experto.'],
    ['Independencia, disfrute y abundancia propia.', 'Amar desde la autosuficiencia.', 'Los frutos de tu esfuerzo.', 'Disfruta lo que lograste por ti.'],
    ['Riqueza duradera, familia y legado.', 'Un compromiso estable a largo plazo.', 'Éxito sólido; negocio que perdura.', 'Tus raíces y lo que vas a dejar.'],
    ['Curiosidad práctica y ganas de aprender.', 'Un interés tranquilo y sincero.', 'Estudiar o aprender una habilidad nueva.', 'Empieza un hábito pequeño.'],
    ['Constancia, método y paso firme.', 'Lealtad tranquila.', 'Trabajo sostenido que rinde.', 'Lento pero seguro.'],
    ['Cuidado práctico, hogar y abundancia generosa.', 'Un amor que cuida con hechos.', 'Equilibrar el trabajo con tu bienestar.', 'Tu cuerpo y tu casa son tu refugio.'],
    ['Éxito material, estabilidad y generosidad.', 'Una pareja confiable que protege.', 'Liderazgo sólido y buen momento económico.', 'Disfruta la seguridad que construiste.'],
  ],
  espadas: [
    ['Claridad, verdad y una idea que corta la confusión.', 'Hace falta una conversación honesta.', 'Una idea brillante o una decisión clara.', 'Di tu verdad.'],
    ['Indecisión y bloqueo: evitar mirar.', 'Evitas una conversación; quítate la venda.', 'Decisión pendiente: reúne información.', 'Escucha también a tu corazón.'],
    ['Dolor, tristeza y una verdad que duele.', 'Desamor o herida; date tiempo.', 'Una decepción o una crítica dura.', 'Llorar también limpia.'],
    ['Descanso y recuperación mental.', 'Una pausa para sanar.', 'Toma aire antes de seguir.', 'Descansa sin culpa.'],
    ['Conflicto y victorias que cuestan caro.', 'Una discusión donde nadie gana.', 'Tensión o competencia desleal.', 'Elige tus batallas.'],
    ['Transición hacia aguas más tranquilas.', 'Dejar atrás lo difícil.', 'Un cambio que alivia.', 'Vas saliendo de la tormenta.'],
    ['Estrategia, astucia y algo que no se dice.', 'Ojo con la falta de honestidad.', 'Actúa con estrategia, no a escondidas.', 'Sé honesto contigo mismo.'],
    ['Sentirte atrapado por tu propia mente.', 'Miedos que te limitan.', 'Crees que no hay salida, pero la hay.', 'Las vendas se pueden quitar.'],
    ['Ansiedad, preocupación y noches sin dormir.', 'Miedos que crecen de noche.', 'Estrés: pide ayuda.', 'Tus pensamientos no son hechos.'],
    ['Un final doloroso: tocar fondo para empezar a subir.', 'Un cierre definitivo.', 'Fin de algo que ya no daba más.', 'Lo peor ya pasó.'],
    ['Curiosidad mental, atención y ganas de saber.', 'Preguntas y una comunicación nueva.', 'Investiga y aprende rápido.', 'Observa antes de opinar.'],
    ['Acción rápida y palabras directas.', 'Impulsividad: cuida cómo hablas.', 'Avanza con decisión.', 'Rápido sí, atropellado no.'],
    ['Claridad, independencia y verdad sin rodeos.', 'Límites claros y honestidad.', 'Juicio agudo y objetivo.', 'Tu experiencia te dio sabiduría.'],
    ['Autoridad intelectual, lógica y justicia.', 'Mucha razón y poca emoción; busca el balance.', 'Decisiones firmes y bien pensadas.', 'Piensa claro y decide con ética.'],
  ],
  bastos: [
    ['Chispa de inspiración y un impulso creativo nuevo.', 'Atracción y deseo nuevos.', 'Una idea o proyecto con mucha energía.', 'Sigue lo que te enciende.'],
    ['Planear el futuro y elegir el rumbo.', 'Pensar hacia dónde va la relación.', 'Planificación y visión.', 'El mundo es más grande: mira lejos.'],
    ['Expansión: esperar resultados que vienen de lejos.', 'Una relación que crece, o a distancia.', 'Tus proyectos se expanden.', 'Lo que lanzaste ya está en camino.'],
    ['Celebración, hogar y estabilidad alegre.', 'Compromiso o celebración juntos.', 'Un hito alcanzado.', 'Celebra lo que tienes.'],
    ['Competencia y fricción creativa.', 'Roces y desacuerdos.', 'Competencia o caos en el equipo.', 'Canaliza esa energía.'],
    ['Victoria y reconocimiento.', 'Orgullo por la relación.', 'Éxito y aplausos.', 'Reconoce tus logros.'],
    ['Defender tu lugar con valentía.', 'Defender lo que sientes.', 'Sostén tu idea frente a las críticas.', 'No cedas en lo importante.'],
    ['Movimiento rápido y noticias.', 'Las cosas avanzan rápido.', 'Todo se acelera: responde.', 'Fluye con la velocidad.'],
    ['Resiliencia: cansado pero firme.', 'Viejas heridas te ponen a la defensiva.', 'Último esfuerzo antes de lograrlo.', 'Ya casi; no te rindas.'],
    ['Carga pesada y exceso de responsabilidades.', 'Estás cargando solo con la relación.', 'Demasiado trabajo: delega.', 'Suelta lo que no te toca.'],
    ['Entusiasmo, exploración y ganas de aventura.', 'Un coqueteo divertido.', 'Una idea nueva para explorar.', 'Prueba algo distinto.'],
    ['Pasión, aventura e impulso.', 'Un romance intenso y rápido.', 'Acción audaz.', 'Vive con intensidad, sin quemarte.'],
    ['Confianza, carisma y calidez.', 'Atracción magnética.', 'Un liderazgo que inspira.', 'Muéstrate con seguridad.'],
    ['Visión, liderazgo y emprendimiento.', 'Una pareja apasionada y leal.', 'Es momento de liderar tu visión.', 'Toma el mando de tu vida.'],
  ],
};

const MAJ_ASTRO = ['Urano', 'Mercurio', 'Luna', 'Venus', 'Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo', 'Júpiter', 'Libra', 'Neptuno', 'Escorpio', 'Sagitario', 'Capricornio', 'Marte', 'Acuario', 'Piscis', 'Sol', 'Plutón', 'Saturno'];
const MAJ_ELEM = ['Aire', 'Aire', 'Agua', 'Tierra', 'Fuego', 'Tierra', 'Aire', 'Agua', 'Fuego', 'Tierra', 'Fuego', 'Aire', 'Agua', 'Agua', 'Fuego', 'Tierra', 'Fuego', 'Aire', 'Agua', 'Fuego', 'Fuego', 'Tierra'];
const DECANS: Record<Exclude<Suit, 'mayor'>, [string, string, string]> = { bastos: ['Aries', 'Leo', 'Sagitario'], copas: ['Cáncer', 'Escorpio', 'Piscis'], espadas: ['Libra', 'Acuario', 'Géminis'], pentaculos: ['Capricornio', 'Tauro', 'Virgo'] };
const COURT_ELEM = ['Tierra', 'Fuego', 'Agua', 'Aire'];

export interface CardInfo { energy: string; love: string; work: string; self: string; astro: string; element: string }

export function cardInfo(c: CardDef): CardInfo {
  if (c.suit === 'mayor') { const m = MAJ[c.num]; return { energy: m[0], love: m[1], work: m[2], self: m[3], astro: MAJ_ASTRO[c.num], element: MAJ_ELEM[c.num] }; }
  const m = MIN[c.suit][c.num - 1], el = SUITS[c.suit].el;
  let astro: string;
  if (c.num === 1) astro = `Raíz del ${el}`;
  else if (c.num <= 10) astro = DECANS[c.suit][Math.floor((c.num - 2) / 3)];
  else astro = `${COURT_ELEM[c.num - 11]} de ${el}`;
  return { energy: m[0], love: m[1], work: m[2], self: m[3], astro, element: el };
}

/** Lectura de una carta según la posición que ocupa en la tirada. */
export function readingFor(c: CardDef, area: string): string {
  const i = cardInfo(c);
  if (area === 'Amor') return i.love;
  if (area === 'Trabajo') return i.work;
  if (area === 'Personal' || area === 'Sombra') return i.self;
  return i.energy;
}

/** Descripción general de una tirada completa, cercana y en segunda persona. */
export function readingSummary(r: Reading): string {
  const cs = validCards(r).map(x => CARDS[x.c]);
  if (!cs.length) return '';
  const maj = cs.filter(c => c.suit === 'mayor').length, rev = validCards(r).filter(x => x.r).length;
  const count: Partial<Record<Suit, number>> = {};
  cs.forEach(c => { count[c.suit] = (count[c.suit] || 0) + 1; });
  const dom = Object.entries(count).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0] as Suit;
  const tone: Record<Suit, string> = {
    mayor: 'una tirada de lecciones grandes: lo que pasa ahora tiene peso en tu camino',
    copas: 'una tirada del corazón: lo que sientes está al centro',
    pentaculos: 'una tirada con los pies en la tierra: cuerpo, casa y lo concreto',
    espadas: 'una tirada de cabeza: pensamientos, palabras y decisiones',
    bastos: 'una tirada con fuego: ganas, deseo y energía para crear',
  };
  const parts: string[] = [`Es ${tone[dom]}.`];
  validCards(r).forEach((x, i) => {
    const c = CARDS[x.c], area = posOf(r, i);
    const t = readingFor(c, area);
    const label = area === 'Amor' ? 'En el amor' : area === 'Trabajo' ? 'En el trabajo' : area === 'Personal' ? 'Contigo' : area;
    parts.push(`${label}, ${c.name}${x.r ? ' (invertida, su energía va más hacia adentro)' : ''}: ${t.charAt(0).toLowerCase() + t.slice(1)}`);
  });
  if (maj >= 2) parts.push('Que salgan varios Arcanos Mayores dice que no es un día cualquiera: préstale atención.');
  if (rev >= 2) parts.push('Varias invertidas: hay algo que estás guardando o que todavía no fluye.');
  return parts.join(' ');
}

// Reemplaza las palabras clave genéricas por el significado real de cada carta.
for (const c of Object.values(CARDS)) {
  const e = cardInfo(c).energy;
  c.msg = e;
  if (c.suit !== 'mayor') c.kw = e.split(/[:.]/)[0].replace(/^Un[a]? /, '').toLowerCase();
}

/** Texto más completo para el momento de girar la carta. */
export function revealText(c: CardDef, area: string, rev?: boolean): string {
  const e = cardInfo(c).energy.replace(/\.$/, '');
  const base = readingFor(c, area);
  const deep = base === cardInfo(c).energy ? '' : ` En el fondo, esta carta habla de ${e.charAt(0).toLowerCase() + e.slice(1)}.`;
  return `${base}${deep}${rev ? ' Salió invertida: esa energía está más hacia adentro o algo la frena. Mírala con suavidad, sin juzgarte.' : ''}`;
}
