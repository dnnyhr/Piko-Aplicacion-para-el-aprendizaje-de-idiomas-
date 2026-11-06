"""
El oído de Piko: escucha un intento y dice qué tan cerca estuvo de la palabra.

Usa MMS-1b-all de Meta con su adaptador de miskito (`miq`). Dos pasadas sobre
el mismo audio:

  Libre      el modelo transcribe sin saber qué esperar. Sirve para ver si
             dijo otra cosa, y para el maestro: «oyó yul pisa».
  Forzada    se le da la palabra esperada y se le pide que la ubique letra por
             letra en el audio. La seguridad de cada letra dice dónde sonó
             distinto. Es la idea de las notas de pronunciación (GOP).

**Prototipo.** MMS-1b-all tiene licencia CC-BY-NC 4.0: sirve para probar en el
aula, no para el robot que se venda. Cambiar de modelo es cambiar `MODELO` y
`IDIOMA`; omniASR (Apache 2.0) también cubre el miskito.
"""

from __future__ import annotations

import io
import os
import time
import unicodedata

import numpy as np
import torch
import torchaudio.functional as F
from scipy.io import wavfile
from transformers import AutoProcessor, Wav2Vec2ForCTC

from comparar import CIRCUNFLEJO, letras_a_evaluar, parecido, veredicto

MODELO = os.environ.get("PIKO_MODELO", "facebook/mms-1b-all")
IDIOMA = os.environ.get("PIKO_IDIOMA", "miq")
SR = 16000

# Por debajo de esto, la grabación es silencio o ruido de fondo. Medido con el
# micrófono de una Mac: la voz da picos de 0,4 a 0,5 y una grabación sin voz,
# 0,006.
PICO_MINIMO = 0.02
VOZ_MINIMA_S = 0.15


def leer_wav(datos: bytes) -> tuple[np.ndarray, int]:
    """Un WAV de 16 bits como el que arma `oido.js` en el navegador, o de coma
    flotante como los de las pruebas en Python."""
    sr, crudo = wavfile.read(io.BytesIO(datos))
    if crudo.dtype == np.int16:
        crudo = crudo.astype(np.float32) / 32768
    elif crudo.dtype != np.float32:
        raise ValueError(f"formato de audio no soportado: {crudo.dtype}")
    if crudo.ndim > 1:
        crudo = crudo.mean(1)
    return crudo, sr


def recortar_voz(audio: np.ndarray) -> tuple[np.ndarray, float]:
    """Saca el silencio de las puntas y devuelve cuántos segundos hay de voz.

    Al modelo le va mejor sin el segundo de silencio de antes, y la duración
    sirve para decir «no te escuché» en vez de evaluar ruido."""
    ventana = int(0.02 * SR)
    if len(audio) < ventana:
        return audio, 0.0
    n = len(audio) // ventana
    energia = np.sqrt((audio[: n * ventana].reshape(n, ventana) ** 2).mean(1))
    umbral = max(energia.max() * 0.12, 0.004)
    activas = np.nonzero(energia > umbral)[0]
    if len(activas) == 0:
        return audio[:0], 0.0
    desde = max(activas[0] - 10, 0) * ventana       # 200 ms de margen
    hasta = min(activas[-1] + 15, n) * ventana      # 300 ms al final
    return audio[desde:hasta], len(activas) * ventana / SR


class Oido:
    def __init__(self):
        t = time.time()
        self.proc = AutoProcessor.from_pretrained(MODELO, target_lang=IDIOMA)
        self.modelo = Wav2Vec2ForCTC.from_pretrained(MODELO, target_lang=IDIOMA, ignore_mismatched_sizes=True)
        self.modelo.eval()
        self.vocab = self.proc.tokenizer.get_vocab()
        self.blanco = self.proc.tokenizer.pad_token_id
        self.separador = self.proc.tokenizer.word_delimiter_token
        # La primera pasada por el modelo tarda diez veces más que las demás.
        # Que la pague el arranque y no el primer chico que habla.
        with torch.no_grad():
            self.modelo(**self.proc(np.zeros(SR, dtype=np.float32), sampling_rate=SR, return_tensors="pt"))
        self.segundos_de_carga = time.time() - t

    def _tolerante(self, logp: torch.Tensor) -> torch.Tensor:
        """S1: en miskito una i que suena [e] o una u que suena [o] no cambia
        la palabra. Para la alineación, cada una cuenta también como la otra."""
        logp = logp.clone()
        for vocal, vecina in (("i", "e"), ("u", "o")):
            if vocal in self.vocab and vecina in self.vocab:
                a, b = self.vocab[vocal], self.vocab[vecina]
                logp[:, a] = torch.logaddexp(logp[:, a], logp[:, b])
        return logp

    def _alinear(self, logp: torch.Tensor, forma: str) -> list[dict]:
        letras = [(c if c != "|" else self.separador, cuenta) for c, cuenta in letras_a_evaluar(forma)]
        letras = [(c, cuenta) for c, cuenta in letras if c in self.vocab]
        if not letras:
            return []
        ids = torch.tensor([[self.vocab[c] for c, _ in letras]], dtype=torch.int32)
        alin, puntos = F.forced_align(logp.unsqueeze(0), ids, blank=self.blanco)
        tramos = F.merge_tokens(alin[0], puntos[0].exp())
        return [
            {"letra": c, "seguridad": round(float(t.score), 3), "cuenta": cuenta}
            for (c, cuenta), t in zip(letras, tramos)
        ]

    def evaluar(self, wav: bytes, formas: list[str], exigencia: str = "normal") -> dict:
        audio, sr = leer_wav(wav)
        if sr != SR:
            audio = F.resample(torch.from_numpy(audio), sr, SR).numpy()
        pico = float(np.abs(audio).max()) if len(audio) else 0.0
        audio, voz_s = recortar_voz(audio)
        base = {"pico": round(pico, 3), "voz_s": round(voz_s, 2)}
        if pico < PICO_MINIMO or voz_s < VOZ_MINIMA_S:
            return {**base, "veredicto": "silencio", "oyo": ""}

        t = time.time()
        entrada = self.proc(audio, sampling_rate=SR, return_tensors="pt")
        with torch.no_grad():
            logits = self.modelo(**entrada).logits[0]
        oyo = self.proc.decode(logits.argmax(-1)).strip()
        logp = self._tolerante(torch.log_softmax(logits, -1))

        candidatas = []
        for forma in formas:
            try:
                letras = self._alinear(logp, forma)
            except Exception:
                # El audio es más corto que la palabra: no entra ni una letra
                # por cuadro. Pasa con un «sí» cuando se esperaba una frase.
                letras = []
            calificadas = [l for l in letras if l["cuenta"]]
            puntaje = sum(l["seguridad"] for l in calificadas) / len(calificadas) if calificadas else 0.0
            minimo = min((l["seguridad"] for l in calificadas), default=0.0)
            sim = parecido(oyo, forma)
            candidatas.append({
                "forma": forma,
                "letras": letras,
                "puntaje": round(puntaje, 3),
                "minimo": round(minimo, 3),
                "parecido": round(sim, 3),
                "veredicto": veredicto(puntaje, minimo, sim, exigencia),
            })

        # Cualquiera de las formas aceptadas vale: si dijo «mitha» y la tarjeta
        # dice «mihta», está bien (S3).
        mejor = max(candidatas, key=lambda c: (c["veredicto"] == "bien", c["puntaje"] + c["parecido"]))
        return {
            **base,
            "oyo": oyo,
            "veredicto": mejor["veredicto"],
            "forma": mejor["forma"],
            "letras": mejor["letras"],
            "puntaje": mejor["puntaje"],
            "minimo": mejor["minimo"],
            "parecido": mejor["parecido"],
            "otra_palabra": mejor["parecido"] < 0.35 and mejor["puntaje"] < 0.3,
            "pista": pista(mejor["letras"]) if mejor["veredicto"] == "casi" else None,
            "segundos": round(time.time() - t, 2),
        }


def pista(letras: list[dict]) -> dict | None:
    """La letra que más le costó, para que Piko la muestre.

    Si la palabra tiene una vocal larga y es lo más flojo, la pista es la
    duración (S8): es lo único que la voz en español no puede enseñar."""
    calificadas = [(i, l) for i, l in enumerate(letras) if l["cuenta"]]
    if not calificadas:
        return None
    es_larga = lambda l: CIRCUNFLEJO in unicodedata.normalize("NFD", l["letra"])  # noqa: E731
    i, floja = min(calificadas, key=lambda par: par[1]["seguridad"])
    if floja["seguridad"] > 0.5:
        return None
    # Si una vocal larga está casi tan floja como la peor, la pista es ésa.
    for j, l in calificadas:
        if es_larga(l) and l["seguridad"] <= floja["seguridad"] + 0.05:
            i, floja = j, l
            break
    return {"tipo": "vocal_larga" if es_larga(floja) else "letra", "letra": floja["letra"], "posicion": i}

