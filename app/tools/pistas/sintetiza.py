"""Pistas instrumentales de Piko: marimba (la melodía), una voz suave que la sigue y tambor.
Devuelve los tiempos exactos de cada palabra."""
import json, subprocess, sys
import numpy as np
from melodias import CANCIONES

SR = 22050
CUENTA = 4  # pulsos de tambor antes de empezar

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

def marimba(f, dur):
    n = int(SR * max(dur, 0.25) * 1.6)
    t = np.arange(n) / SR
    env = np.exp(-t * 6.0)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 3.93 * f * t) * np.exp(-t * 18) + 0.15 * np.sin(2 * np.pi * 9.2 * f * t) * np.exp(-t * 40)
    ataque = np.minimum(1, t / 0.004)
    return 0.55 * s * env * ataque

def voz(f, dur):
    n = int(SR * dur)
    t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(1, t / 0.25)
    fase = 2 * np.pi * f * np.cumsum(vib) / SR
    s = np.sin(fase) + 0.25 * np.sin(2 * fase) + 0.1 * np.sin(3 * fase)
    env = np.minimum(1, t / 0.04) * np.minimum(1, (dur - t) / 0.06).clip(0)
    return 0.22 * s * env

def tambor(fuerte):
    n = int(SR * 0.35)
    t = np.arange(n) / SR
    f = 95 * np.exp(-t * 9) + 55
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
    ruido = np.random.default_rng(1).normal(0, 1, n) * np.exp(-t * 60) * 0.25
    return (0.7 if fuerte else 0.35) * (s + ruido)

def maraca():
    n = int(SR * 0.08)
    t = np.arange(n) / SR
    return np.random.default_rng(2).normal(0, 1, n) * np.exp(-t * 55) * 0.08

def sumar(buf, x, i):
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i]

def generar(id_, c, salida):
    pulso = 60.0 / c['bpm']
    total = sum(d for linea in c['lineas'] for _, notas in linea for _, d in notas)
    largo = (CUENTA + total + 3) * pulso
    buf = np.zeros(int(SR * largo) + SR)
    inicio = 0.3
    # Tambor: en cada pulso, más fuerte al empezar el compás de 4.
    k = 0
    t = inicio
    while t < inicio + (CUENTA + total + 2) * pulso:
        sumar(buf, tambor(k % 4 == 0), int(t * SR))
        if k >= CUENTA:
            sumar(buf, maraca(), int((t + pulso / 2) * SR))
        t += pulso
        k += 1
    t = inicio + CUENTA * pulso
    versos = []
    for linea in c['lineas']:
        palabras, tiempos = [], []
        v_ini = t
        for w, notas in linea:
            palabras.append(w)
            tiempos.append(round(t, 3))
            for m, d in notas:
                dur = d * pulso
                sumar(buf, marimba(hz(m), dur), int(t * SR))
                sumar(buf, voz(hz(m), dur * 0.95), int(t * SR))
                t += dur
        versos.append({'texto': ' '.join(palabras), 'inicio': round(v_ini, 3), 'fin': round(t, 3), 'tiempos': tiempos})
    buf = buf / np.max(np.abs(buf)) * 0.85
    wav = salida + '.wav'
    import wave
    with wave.open(wav, 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes((buf * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', salida + '.m4a'], check=True)
    return {'bpm': c['bpm'], 'pulso': round(inicio, 3), 'versos': versos, 'duracion': round(largo, 2)}

if __name__ == '__main__':
    destino = sys.argv[1]
    out = {}
    for id_, c in CANCIONES.items():
        out[id_] = generar(id_, c, f'{destino}/{id_}')
        print(id_, out[id_]['duracion'], 's,', len(out[id_]['versos']), 'versos')
    json.dump(out, open(f"{destino}/tiempos.json", "w"), ensure_ascii=False, indent=1)
