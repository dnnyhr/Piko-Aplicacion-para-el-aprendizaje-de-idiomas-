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

async function api(ruta) {
  const res = await fetch(ruta, { headers: { authorization: `Bearer ${token}` } });
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
    return h('article', { class: 'pregunta' }, h('h3', {}, p.texto), h('p', { class: 'meta' }, `${p.id} · ${p.respondieron} personas`), cuerpo);
  });

  cont.replaceChildren(cifras, ...bloques);
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
