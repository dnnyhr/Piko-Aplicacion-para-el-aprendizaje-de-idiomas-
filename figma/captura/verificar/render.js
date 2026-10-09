/**
 * Dibuja con HTML el árbol de nodos que dejó el plugin en el `figma` falso.
 * El auto layout de Figma se traduce a flexbox con la misma semántica:
 *   - el trazo no ocupa lugar (se pinta encima, por dentro),
 *   - HUG = tamaño de contenido, FILL = flex 1 / stretch, FIXED = px,
 *   - los hijos ABSOLUTE se ubican por x / y.
 */
(function () {
  const FAMILIA = { Fredoka: 'Fredoka', 'Nunito Sans': 'Nunito Sans', Inter: 'Inter, Arial, sans-serif' };
  const PESO = { Regular: 400, Medium: 500, SemiBold: 600, 'Semi Bold': 600, Bold: 700 };

  const css = (p) => {
    if (!p || p.type !== 'SOLID') return null;
    const c = p.color;
    const a = p.opacity === undefined ? 1 : p.opacity;
    return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
  };

  function textoDom(n, ancho) {
    const el = document.createElement('div');
    el.style.whiteSpace = ancho === null ? 'pre' : 'pre-wrap';
    el.style.wordBreak = 'break-word';
    if (ancho !== null && ancho !== undefined) el.style.width = ancho + 'px';
    el.style.lineHeight = n.lineHeight && n.lineHeight.unit === 'PIXELS' ? n.lineHeight.value + 'px' : 'normal';
    el.style.textAlign = { LEFT: 'left', CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'justify' }[n.textAlignHorizontal];
    // La fuente del contenedor = la del primer tramo: si no, el «strut» de la
    // fuente por defecto agranda las líneas (Figma no tiene ese efecto).
    if (n.textTruncation === 'ENDING' && n.maxLines > 1) {
      el.style.display = '-webkit-box';
      el.style.webkitBoxOrient = 'vertical';
      el.style.webkitLineClamp = String(n.maxLines);
      el.style.overflow = 'hidden';
    } else if (n.textTruncation === 'ENDING') {
      el.style.whiteSpace = 'pre';
      el.style.overflow = 'hidden';
      el.style.textOverflow = 'ellipsis';
    }
    const r0 = n._rangos[0];
    if (r0) {
      el.style.fontFamily = FAMILIA[r0.fuente.family] || r0.fuente.family;
      el.style.fontSize = r0.tam + 'px';
      el.style.fontWeight = PESO[r0.fuente.style] || 400;
    }
    for (const r of n._rangos) {
      const s = document.createElement('span');
      s.textContent = n._chars.slice(r.i, r.f);
      s.style.fontFamily = FAMILIA[r.fuente.family] || r.fuente.family;
      s.style.fontWeight = PESO[r.fuente.style] || 400;
      s.style.fontSize = r.tam + 'px';
      s.style.letterSpacing = (r.ls || 0) + 'px';
      s.style.textTransform = r.caso === 'UPPER' ? 'uppercase' : 'none';
      s.style.textDecoration = r.deco === 'UNDERLINE' ? 'underline' : 'none';
      const f = r.fills && r.fills[0];
      s.style.color = css(f) || 'black';
      el.appendChild(s);
    }
    return el;
  }

  function dibujar(n, padre) {
    let el;
    const enAL = padre && padre.layoutMode && padre.layoutMode !== 'NONE' && n.layoutPositioning !== 'ABSOLUTE';
    if (n.type === 'TEXT') {
      el = textoDom(n, n.textAutoResize === 'WIDTH_AND_HEIGHT' ? null : n.width);
      if (n.textAutoResize === 'NONE') el.style.height = n.height + 'px';

    } else {
      el = document.createElement('div');
      const al = n.layoutMode && n.layoutMode !== 'NONE';
      if (n.type !== 'VECTOR') el.style.width = n.width + 'px';
      el.style.height = n.height + 'px';
      el.style.boxSizing = 'border-box';
      const fondo = (n.fills || []).filter((f) => f.visible !== false);
      for (const f of fondo) {
        if (f.type === 'SOLID') el.style.backgroundColor = css(f);
        if (f.type === 'IMAGE') {
          el.style.backgroundImage = `url(${window.__imagenes[f.imageHash]})`;
          el.style.backgroundSize = f.scaleMode === 'FIT' ? 'contain' : 'cover';
          el.style.backgroundPosition = 'center';
          el.style.backgroundRepeat = 'no-repeat';
        }
      }
      const r = [n.topLeftRadius, n.topRightRadius, n.bottomRightRadius, n.bottomLeftRadius].map((x) => (x || 0) + 'px');
      el.style.borderRadius = r.join(' ');
      if (n.clipsContent && n.type !== 'RECTANGLE') el.style.overflow = 'hidden';
      if (n._svg) {
        el.innerHTML = n._svg;
        const s = el.firstElementChild;
        s.setAttribute('width', '100%');
        s.setAttribute('height', '100%');
        s.setAttribute('preserveAspectRatio', 'none');
        s.style.display = 'block';
      }
      if (n.type === 'VECTOR') {
        el.style.width = '0px';
        el.style.height = '0px';
      }
      if (al) {
        el.style.display = 'flex';
        el.style.flexDirection = n.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
        el.style.padding = `${n.paddingTop}px ${n.paddingRight}px ${n.paddingBottom}px ${n.paddingLeft}px`;
        el.style.justifyContent = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', SPACE_BETWEEN: 'space-between' }[n.primaryAxisAlignItems];
        el.style.alignItems = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', BASELINE: 'baseline' }[n.counterAxisAlignItems];
        if (n.layoutWrap === 'WRAP') {
          el.style.flexWrap = 'wrap';
          el.style.columnGap = n.itemSpacing + 'px';
          el.style.rowGap = n.counterAxisSpacing + 'px';
          el.style.alignContent = 'flex-start';
        } else el.style.gap = n.itemSpacing + 'px';
        const H = n.layoutMode === 'HORIZONTAL';
        if (n._sizing.h === 'HUG') el.style.width = H ? 'max-content' : 'fit-content';
        if (n._sizing.v === 'HUG') el.style.height = 'auto';
      }
      // Trazo por dentro, sin ocupar lugar.
      const trazo = (n.strokes || [])[0];
      if (trazo && n.type !== 'VECTOR') {
        const t = document.createElement('div');
        t.style.cssText = 'position:absolute;inset:0;pointer-events:none;box-sizing:border-box;z-index:1';
        t.style.borderStyle = n.dashPattern && n.dashPattern.length ? 'dashed' : 'solid';
        t.style.borderColor = css(trazo);
        t.style.borderWidth = `${n.strokeTopWeight || 0}px ${n.strokeRightWeight || 0}px ${n.strokeBottomWeight || 0}px ${n.strokeLeftWeight || 0}px`;
        t.style.borderRadius = el.style.borderRadius;
        el.appendChild(t);
      }
      el.style.position = 'relative';
      // Cada marco es su propio contexto: el trazo no se escapa por encima de los hermanos.
      el.style.isolation = 'isolate';
      for (const c of n.children || []) el.appendChild(dibujar(c, n));
    }
    if (n.opacity !== undefined && n.opacity < 1) el.style.opacity = n.opacity;
    el.dataset.nombre = n.name;

    if (enAL) {
      const H = padre.layoutMode === 'HORIZONTAL';
      el.style.flexShrink = '0';
      el.style.position = el.style.position || 'relative';
      const sh = n._sizing.h;
      const sv = n._sizing.v;
      if (H) {
        if (sh === 'FILL') {
          el.style.flex = '1 1 0';
          el.style.width = 'auto';
          el.style.minWidth = '0';
        }
        if (sv === 'FILL') {
          el.style.alignSelf = 'stretch';
          el.style.height = 'auto';
        }
      } else {
        if (sv === 'FILL') {
          el.style.flex = '1 1 0';
          el.style.height = 'auto';
          el.style.minHeight = '0';
        }
        if (sh === 'FILL') {
          el.style.alignSelf = 'stretch';
          el.style.width = 'auto';
        }
      }
      if (n.type === 'TEXT' && sh === 'FILL' && !(n.textTruncation === 'ENDING' && n.maxLines === 1)) el.style.whiteSpace = 'pre-wrap';
    } else if (padre) {
      el.style.position = 'absolute';
      if (n.relativeTransform) {
        const m = n.relativeTransform;
        el.style.left = '0px';
        el.style.top = '0px';
        el.style.transformOrigin = '0 0';
        el.style.transform = `matrix(${m[0][0]},${m[1][0]},${m[0][1]},${m[1][1]},${m[0][2]},${m[1][2]})`;
      } else {
        const k = n.constraints || {};
        el.style.left = n.x + 'px';
        el.style.top = n.y + 'px';
        // Restricciones: en Figma el hijo sigue al padre cuando éste cambia de tamaño.
        if (k.horizontal === 'STRETCH') {
          el.style.right = padre.width - n.x - n.width + 'px';
          el.style.width = 'auto';
        }
        if (k.vertical === 'STRETCH') {
          el.style.bottom = padre.height - n.y - n.height + 'px';
          el.style.height = 'auto';
        } else if (k.vertical === 'MAX') {
          el.style.top = 'auto';
          el.style.bottom = padre.height - n.y - n.height + 'px';
        }
      }
      if (n.type === 'VECTOR' && n.vectorNetwork) {
        const v = n.vectorNetwork.vertices;
        const sg = n.vectorNetwork.segments[0];
        const a = v[sg.start];
        const b = v[sg.end];
        const d = `M ${a.x} ${a.y} C ${a.x + sg.tangentStart.x} ${a.y + sg.tangentStart.y} ${b.x + sg.tangentEnd.x} ${b.y + sg.tangentEnd.y} ${b.x} ${b.y}`;
        el.innerHTML = `<svg style="position:absolute;overflow:visible" width="1" height="1"><path d="${d}" stroke="${css(n.strokes[0])}" stroke-width="${n.strokeWeight}" fill="none"/><circle cx="${b.x}" cy="${b.y}" r="5" fill="${css(n.strokes[0])}"/></svg>`;
      } else if (n.type === 'VECTOR' && n.vectorPaths && n.vectorPaths.length) {
        el.innerHTML = `<svg style="position:absolute;overflow:visible" width="1" height="1"><path d="${n.vectorPaths[0].data}" stroke="#9AA19C" fill="none"/></svg>`;
      }
    }
    return el;
  }

  window.__pikoRender = { textoDom, dibujar };
})();
