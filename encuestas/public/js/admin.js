/**
 * Panel de resultados. Lee los agregados que arma el Worker y los pinta como
 * barras; para análisis en serio, el botón de CSV.
 */

const $ = (id) => document.getElementById(id);
const CLAVE = 'piko-encuestas:token';

function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'style') el.setAttribute('style', v);
    else el.setAttribute(k, v);
  }
  for (const x of hijos.flat()) if (x !== null && x !== undefined && x !== false) el.append(x instanceof Node ? x : String(x));
  return el;
}

let token = sessionStorage.getItem(CLAVE) ?? '';

async function api(ruta, opciones = {}) {
  const res = await fetch(ruta, {
    ...opciones,
    headers: { authorization: `Bearer ${token}`, ...(opciones.body ? { 'content-type': 'application/json' } : {}) },
  });
  if (res.status === 401) throw new Error('Token inválido.');
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Error ${res.status}`);
  return res;
}

async function entrar() {
  try {
    const { encuestas } = await (await api('/api/admin/encuestas')).json();
    sessionStorage.setItem(CLAVE, token);
    $('acceso').hidden = true;
    $('panel').hidden = false;
    const sel = $('encuesta');
    sel.replaceChildren(...encuestas.map((e) => h('option', { value: e.slug }, `${e.titulo} · ${e.estado} · ${e.respuestas} resp.`)));
    if (encuestas.length) mostrar(encuestas[0].slug);
    else $('resumen').replaceChildren(h('p', {}, 'Todavía no hay encuestas publicadas.'));
  } catch (err) {
    $('acceso-error').textContent = err.message;
    sessionStorage.removeItem(CLAVE);
  }
}

function barra(etiqueta, n, total, extra = '') {
  const pct = total ? Math.round((n / total) * 100) : 0;
  return h(
    'div',
    { class: 'barra-dato' },
    h('span', {}, etiqueta),
    h('div', { class: 'barra-dato__pista' }, h('div', { class: 'barra-dato__relleno', style: `width:${pct}%` })),
    h('span', { class: 'barra-dato__n' }, extra || `${n} · ${pct}%`),
  );
}

async function mostrar(slug) {
  const cont = $('resumen');
  cont.replaceChildren(h('p', { class: 'meta' }, 'Cargando…'));
  const r = await (await api(`/api/admin/encuestas/${slug}/resumen`)).json();

  const cifras = h(
    'div',
    { class: 'cifras' },
    h('div', { class: 'cifra' }, h('b', {}, r.respuestas), h('span', {}, 'respuestas')),
    h('div', { class: 'cifra' }, h('b', {}, r.duracionPromedioSeg ? `${Math.round(r.duracionPromedioSeg / 60)} min` : '—'), h('span', {}, 'duración promedio')),
    h('div', { class: 'cifra' }, h('b', {}, `v${r.version}`), h('span', {}, r.estado)),
  );

  const bloques = r.preguntas.map((p) => {
    const cuerpo = [];
    if (p.opciones) {
      const max = Math.max(1, p.respondieron);
      for (const o of [...p.opciones].sort((a, b) => b.n - a.n)) cuerpo.push(barra(o.texto, o.n, max));
      if (p.otros.length) cuerpo.push(h('p', { class: 'meta', style: 'margin-top:10px' }, 'Escribieron en "otro":'), h('ul', { class: 'textos' }, p.otros.map((t) => h('li', {}, t))));
    } else if (p.filas) {
      const rango = p.max - p.min;
      for (const f of p.filas) cuerpo.push(barra(f.texto, f.promedio === null ? 0 : f.promedio - p.min, rango, f.promedio === null ? '—' : `${f.promedio.toFixed(2)} / ${p.max}`));
    } else if (p.distribucion) {
      for (let n = p.min; n <= p.max; n++) cuerpo.push(barra(String(n), p.distribucion[n] ?? 0, Math.max(1, p.respondieron)));
      if (p.promedio !== null) cuerpo.push(h('p', { class: 'meta', style: 'margin-top:8px' }, `Promedio: ${p.promedio.toFixed(2)}`));
    } else if (p.textos) {
      cuerpo.push(p.textos.length ? h('ul', { class: 'textos' }, p.textos.map((t) => h('li', {}, t.texto))) : h('p', { class: 'meta' }, 'Sin respuestas todavía.'));
    }
    return h('article', { class: 'pregunta' }, h('h3', {}, p.texto), h('p', { class: 'meta' }, `${p.id} · ${p.respondieron} personas${p.anterior ? ` · pregunta de la versión ${p.anterior}, ya no está en la encuesta` : ''}`), cuerpo);
  });

  const correos = h('section', { class: 'correos', id: 'correos' });
  const contactos = h('section', { class: 'correos', id: 'contactos' });
  cont.replaceChildren(cifras, correos, contactos, ...bloques);
  mostrarCorreos(slug, correos);
  mostrarContactos(slug, contactos);
}

/* ------------------------------------------------- contactos a mano */

const ETIQUETA_CONTACTO = { enviado: 'Enlace enviado', error: 'Falló', omitido: 'Sin enviar' };

async function mostrarContactos(slug, cont, mensaje = '') {
  const texto = h('textarea', {
    class: 'campo',
    id: 'contactos-texto',
    rows: '5',
    placeholder: 'Uno por línea. Por ejemplo:\nAna López, ana@correo.com\n+505 8888 1234\nCarlos, carlos@correo.com, 8888-5555',
  });
  const enviar = h('input', { type: 'checkbox', id: 'contactos-enviar', checked: '' });
  // Trae al cuadro lo que la gente escribió en preguntas de texto de versiones
  // anteriores que tengan pinta de contacto (un correo o un número), para
  // revisarlo antes de agregarlo.
  const traer = h('button', { class: 'btn btn--papel btn--chico', type: 'button' }, 'Traer los contactos viejos de la encuesta');
  traer.addEventListener('click', async () => {
    traer.disabled = true;
    traer.textContent = 'Buscando…';
    try {
      const r = await (await api(`/api/admin/encuestas/${slug}/contactos/viejos`)).json();
      texto.value = r.lineas.join('\n');
      if (r.lineas.length) traer.textContent = `Se trajeron ${r.lineas.length}: revisalos y tocá "Agregar contactos"`;
      else if (r.yaAgregados) traer.textContent = `Los ${r.yaAgregados} contactos viejos ya estaban agregados`;
      else if (!r.preguntas.length) traer.textContent = 'La encuesta no tiene preguntas de versiones anteriores';
      else traer.textContent = `Nadie dejó un correo o número válido en: ${r.preguntas.map((p) => `"${p.texto}"`).join(', ')}`;
    } catch (err) {
      traer.textContent = `No se pudo: ${err.message}`;
    }
    traer.disabled = false;
  });
  const boton = h('button', { class: 'btn', type: 'submit' }, 'Agregar contactos');
  const aviso = h('p', { class: 'meta', role: 'status' }, mensaje);

  const form = h(
    'form',
    { class: 'pregunta contactos__form' },
    h('label', { class: 'pregunta__titulo', for: 'contactos-texto' }, 'Agregar contactos a mano'),
    h('span', { class: 'pregunta__ayuda' }, 'Para los que dejaron su correo o número antes (por ejemplo en la pregunta "contacto" de la versión anterior) o por fuera de la encuesta. Uno por línea; el nombre es opcional. Los repetidos no se agregan dos veces.'),
    traer,
    texto,
    h('label', { class: 'contactos__check' }, enviar, ' Mandarles el enlace de descarga a los que tengan correo'),
    boton,
  );
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!texto.value.trim()) return;
    boton.disabled = true;
    boton.textContent = enviar.checked ? 'Agregando y mandando…' : 'Agregando…';
    let resultado;
    try {
      const r = await (
        await api(`/api/admin/encuestas/${slug}/contactos`, { method: 'POST', body: JSON.stringify({ texto: texto.value, enviar: enviar.checked }) })
      ).json();
      const partes = [`Agregados: ${r.agregados}`];
      if (r.repetidos) partes.push(`ya estaban: ${r.repetidos}`);
      if (enviar.checked) partes.push(`correos enviados: ${r.enviado}`, `fallaron: ${r.error}`);
      if (r.omitido) partes.push('no se mandaron: falta configurar Resend');
      if (r.sinEnviar) partes.push(`quedaron ${r.sinEnviar} sin mandar: usá "Mandar enlace" en cada uno`);
      if (r.invalidas.length) partes.push(`no se entendieron ${r.invalidas.length} líneas: ${r.invalidas.join(' / ')}`);
      if (r.recortado) partes.push(`solo se leen las primeras ${r.maxLineas} líneas`);
      resultado = partes.join(' · ');
    } catch (err) {
      resultado = err.message;
    }
    mostrarContactos(slug, cont, resultado);
  });

  let lista = [];
  let error = '';
  try {
    ({ contactos: lista } = await (await api(`/api/admin/encuestas/${slug}/contactos`)).json());
  } catch (err) {
    error = err.message;
  }

  cont.replaceChildren(
    ...[
    h('h2', {}, 'Contactos agregados a mano'),
    form,
    aviso,
    error ? h('p', { class: 'meta' }, error) : null,
    lista.length ? h('ul', { class: 'correos__lista' }, lista.map((c) => filaContacto(slug, c, cont))) : null,
    ].filter(Boolean),
  );
}

function filaContacto(slug, c, cont) {
  const acciones = h('div', { class: 'correo__acciones' });
  if (c.correo) {
    const mandar = h('button', { class: 'btn btn--papel btn--chico', type: 'button' }, c.correo_estado === 'enviado' ? 'Reenviar' : 'Mandar enlace');
    mandar.addEventListener('click', async () => {
      if (c.correo_estado === 'enviado' && !confirm(`A ${c.correo} ya le llegó. ¿Mandárselo otra vez?`)) return;
      mandar.disabled = true;
      mandar.textContent = 'Mandando…';
      try {
        await api(`/api/admin/contactos/${c.id}/enviar`, { method: 'POST' });
      } catch (err) {
        alert(err.message);
      }
      mostrarContactos(slug, cont);
    });
    acciones.append(mandar);
  }
  const borrar = h('button', { class: 'btn btn--fantasma btn--chico', type: 'button' }, 'Borrar');
  borrar.addEventListener('click', async () => {
    if (!confirm(`¿Borrar a ${c.nombre ?? c.correo ?? c.telefono}?`)) return;
    try {
      await api(`/api/admin/contactos/${c.id}`, { method: 'DELETE' });
    } catch (err) {
      alert(err.message);
    }
    mostrarContactos(slug, cont);
  });
  acciones.append(borrar);

  const estado = c.correo
    ? h('span', { class: `estado estado--${c.correo_estado ?? 'omitido'}` }, ETIQUETA_CONTACTO[c.correo_estado] ?? 'Sin enviar')
    : h('span', { class: 'estado estado--omitido' }, 'Solo número');
  return h(
    'li',
    { class: 'correo' },
    h('div', { class: 'correo__fila' }, h('b', { class: 'correo__para' }, c.nombre ?? c.correo ?? c.telefono), estado),
    h('p', { class: 'meta correo__para' }, [c.correo, c.telefono].filter(Boolean).join(' · ')),
    c.correo_detalle ? h('p', { class: 'meta correo__detalle' }, c.correo_detalle) : null,
    h('div', { class: 'correo__fila' }, h('span', { class: 'meta' }, `${c.correo_intentos > 1 ? `${c.correo_intentos} intentos · ` : ''}${fecha(c.correo_actualizado_en ?? c.creado_en)}`), acciones),
  );
}

/* ------------------------------------------------------------- correos */

const ETIQUETA = { enviado: 'Enviado', error: 'Falló', omitido: 'Sin enviar' };
const fecha = (iso) =>
  new Date(iso.endsWith('Z') ? iso : `${iso}Z`).toLocaleString('es-NI', { dateStyle: 'short', timeStyle: 'short' });

async function mostrarCorreos(slug, cont, mensaje = '') {
  let lista;
  try {
    ({ correos: lista } = await (await api(`/api/admin/encuestas/${slug}/correos`)).json());
  } catch (err) {
    cont.replaceChildren(h('p', { class: 'meta' }, `Correos: ${err.message}`));
    return;
  }
  if (!lista.length) {
    cont.replaceChildren(h('h2', {}, 'Correos'), h('p', { class: 'meta' }, 'Todavía nadie dejó su correo.'));
    return;
  }

  const cuenta = { enviado: 0, error: 0, omitido: 0 };
  for (const c of lista) cuenta[c.estado] = (cuenta[c.estado] ?? 0) + 1;
  const pendientes = cuenta.error + cuenta.omitido;
  const aviso = h('p', { class: 'meta', role: 'status' }, mensaje);

  const botonTodos = pendientes
    ? h('button', { class: 'btn', type: 'button' }, `Reenviar los que no llegaron (${pendientes})`)
    : null;
  botonTodos?.addEventListener('click', async () => {
    botonTodos.disabled = true;
    aviso.textContent = 'Mandando… puede tardar unos segundos.';
    let resultado;
    try {
      const r = await (await api(`/api/admin/encuestas/${slug}/correos/reenviar`, { method: 'POST', body: '{}' })).json();
      resultado = `Enviados: ${r.enviado} · fallaron: ${r.error} · sin enviar: ${r.omitido}${r.quedan ? ' · quedan más: tocá de nuevo' : ''}`;
    } catch (err) {
      resultado = err.message;
    }
    mostrarCorreos(slug, cont, resultado);
  });

  // replaceChildren convierte null en el texto "null": se filtran los vacíos.
  cont.replaceChildren(
    ...[
    h('h2', {}, 'Correos con el enlace de descarga'),
    h(
      'div',
      { class: 'correos__cuenta' },
      ...['enviado', 'error', 'omitido'].map((k) => h('span', { class: `estado estado--${k}` }, `${ETIQUETA[k]}: ${cuenta[k]}`)),
    ),
    botonTodos,
    aviso,
    h('ul', { class: 'correos__lista' }, lista.map((c) => filaCorreo(slug, c, cont))),
    ].filter(Boolean),
  );
}

function filaCorreo(slug, c, cont) {
  const boton = h('button', { class: 'btn btn--papel btn--chico', type: 'button' }, c.estado === 'enviado' ? 'Reenviar' : 'Intentar de nuevo');
  const estado = h('span', { class: `estado estado--${c.estado}` }, ETIQUETA[c.estado] ?? c.estado);
  boton.addEventListener('click', async () => {
    if (c.estado === 'enviado' && !confirm(`A ${c.para} ya le llegó. ¿Mandárselo otra vez?`)) return;
    boton.disabled = true;
    boton.textContent = 'Mandando…';
    try {
      await api(`/api/admin/correos/${c.respuesta_id}/reenviar`, { method: 'POST' });
    } catch (err) {
      alert(err.message);
    }
    mostrarCorreos(slug, cont);
  });
  return h(
    'li',
    { class: 'correo' },
    h('div', { class: 'correo__fila' }, h('b', { class: 'correo__para' }, c.para), estado),
    c.detalle ? h('p', { class: 'meta correo__detalle' }, c.detalle) : null,
    h('div', { class: 'correo__fila' }, h('span', { class: 'meta' }, `${c.intentos > 1 ? `${c.intentos} intentos · ` : ''}${fecha(c.actualizado_en)}`), boton),
  );
}

$('acceso').addEventListener('submit', (e) => {
  e.preventDefault();
  token = $('token').value.trim();
  entrar();
});
$('encuesta').addEventListener('change', (e) => mostrar(e.target.value));
$('salir').addEventListener('click', () => {
  sessionStorage.removeItem(CLAVE);
  location.reload();
});
$('csv').addEventListener('click', async () => {
  const slug = $('encuesta').value;
  const blob = await (await api(`/api/admin/encuestas/${slug}/csv`)).blob();
  const a = h('a', { href: URL.createObjectURL(blob), download: `${slug}.csv` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

if (token) entrar();
