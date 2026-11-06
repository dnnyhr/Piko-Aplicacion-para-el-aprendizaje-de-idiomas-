/**
 * El micrófono, para que Piko escuche. Lo usan la cara y el panel.
 *
 *   await Oido.preparar(contexto)   en un toque: pide el permiso del micrófono
 *   const g = await Oido.grabar({ maxSegundos: 4 })
 *   g.wav     Blob WAV PCM de 16 bits, como lo espera robot/escucha
 *   g.hayVoz  si se oyó algo más que el ruido de fondo
 *   Oido.cortar()                   corta una grabación en curso
 *
 * Graba PCM crudo y no con MediaRecorder: ése entrega Opus en WebM, y el oído
 * tendría que decodificarlo con ffmpeg, que es una instalación más en la PC
 * del aula. Un WAV lo lee cualquiera.
 *
 * **Sólo en conexión segura.** Los navegadores no prestan el micrófono por
 * http://192.168…, igual que el candado de pantalla: hace falta https (el
 * túnel) o localhost. `preparar` lo dice en vez de fallar callado.
 *
 * Corta solo cuando el chico terminó de hablar: espera a oír voz por encima
 * del ruido de la sala, y después de un silencio corto da la respuesta por
 * terminada. Así no hay que esperar los segundos enteros con cada palabra.
 */
(function () {
  'use strict';

  const MS_RUIDO = 300;          // lo primero que se oye es el piso de ruido
  const MS_SILENCIO_FINAL = 900; // tanto callado después de hablar = terminó
  const UMBRAL_MINIMO = 0.012;   // RMS: por debajo nunca es voz

  /* El procesador corre en el hilo de audio y sólo pasa los cuadros. Va como
     texto para no sumar otro archivo que servir. */
  const PROCESADOR = `
    class Tomar extends AudioWorkletProcessor {
      process(entradas) {
        const canal = entradas[0] && entradas[0][0];
        if (canal) this.port.postMessage(canal.slice(0));
        return true;
      }
    }
    registerProcessor('piko-tomar', Tomar);`;

  let contexto = null;
  let fuente = null;
  let nodo = null;
  let enCurso = null;

  async function preparar(ctx) {
    if (nodo) return true;
    if (!window.isSecureContext || !navigator.mediaDevices) {
      throw new Error('el micrófono sólo anda por https o en localhost');
    }
    contexto = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (contexto.state === 'suspended') await contexto.resume();

    const flujo = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,   // que no se escuche a sí mismo
        noiseSuppression: false,  // recorta las consonantes, que es lo que se evalúa
        autoGainControl: true,    // un chico tímido a un metro también cuenta
      },
    });
    fuente = contexto.createMediaStreamSource(flujo);

    const url = URL.createObjectURL(new Blob([PROCESADOR], { type: 'text/javascript' }));
    await contexto.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    nodo = new AudioWorkletNode(contexto, 'piko-tomar');
    nodo.port.onmessage = (e) => { if (enCurso) enCurso.cuadro(e.data); };

    /* El nodo tiene que estar conectado a la salida para que el navegador lo
       haga correr, pero sin volumen: si no, el micrófono saldría por el
       parlante de Piko. */
    const mudo = contexto.createGain();
    mudo.gain.value = 0;
    fuente.connect(nodo).connect(mudo).connect(contexto.destination);
    return true;
  }

  function rms(cuadro) {
    let s = 0;
    for (let i = 0; i < cuadro.length; i++) s += cuadro[i] * cuadro[i];
    return Math.sqrt(s / cuadro.length);
  }

  function grabar({ maxSegundos = 4, alOirVoz } = {}) {
    if (!nodo) return Promise.reject(new Error('el micrófono no está preparado'));
    cortar();
    if (contexto.state === 'suspended') contexto.resume();

    const sr = contexto.sampleRate;
    const cuadros = [];
    let muestras = 0;
    let piso = 0;
    let nPiso = 0;
    let hayVoz = false;
    let ultimaVoz = 0;

    return new Promise((listo) => {
      const terminar = () => {
        enCurso = null;
        clearTimeout(tope);
        listo({ wav: aWav(cuadros, muestras, sr), hayVoz, segundos: muestras / sr });
      };
      const tope = setTimeout(terminar, maxSegundos * 1000);

      enCurso = {
        terminar,
        cuadro(c) {
          cuadros.push(c);
          muestras += c.length;
          const ms = (muestras / sr) * 1000;
          const nivel = rms(c);
          if (ms < MS_RUIDO) { piso += nivel; nPiso++; return; }
          const umbral = Math.max(UMBRAL_MINIMO, (piso / Math.max(nPiso, 1)) * 3);
          if (nivel > umbral) {
            if (!hayVoz && alOirVoz) alOirVoz();
            hayVoz = true;
            ultimaVoz = ms;
          } else if (hayVoz && ms - ultimaVoz > MS_SILENCIO_FINAL) {
            terminar();
          }
        },
      };
    });
  }

  function cortar() {
    if (enCurso) enCurso.terminar();
  }

  /** WAV mono de 16 bits. La cabecera son 44 bytes fijos. */
  function aWav(cuadros, n, sr) {
    const buf = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buf);
    const texto = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    texto(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); texto(8, 'WAVE');
    texto(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    texto(36, 'data'); v.setUint32(40, n * 2, true);
    let o = 44;
    for (const c of cuadros) {
      for (let i = 0; i < c.length; i++, o += 2) {
        const s = Math.max(-1, Math.min(1, c[i]));
        v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }
    }
    return new Blob([buf], { type: 'audio/wav' });
  }

  /** Le manda la grabación al puente, que se la pasa al oído. El id es el del
      pedido de escucha que abrió el panel: sin él, el puente no la acepta. */
  async function mandar(id, wav) {
    const r = await fetch(`/oido?id=${encodeURIComponent(id)}`, { method: 'POST', body: wav });
    if (!r.ok) throw new Error(`el puente no aceptó el audio (${r.status})`);
  }

  window.Oido = { preparar, grabar, cortar, mandar, listo: () => !!nodo };
})();
