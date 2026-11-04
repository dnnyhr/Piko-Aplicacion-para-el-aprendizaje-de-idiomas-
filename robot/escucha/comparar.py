"""
Qué cuenta como «la misma palabra» al escuchar a un chico decir algo en miskito.

Todo sale de la sección «Sonidos y escritura» de
`diccionario/miskito/gramatica.md`, que dice para cada regla qué tiene que hacer
Piko al evaluar. Cada línea de acá cita la suya. Si un hablante dice que una
regla está mal, se corrige allá y después acá.

No depende del modelo: se prueba sola con `python -m unittest prueba_comparar`.
"""

from __future__ import annotations

import difflib
import re
import unicodedata

CIRCUNFLEJO = "̂"
LARGAS = {"a": "â", "i": "î", "u": "û"}


def _sin_tildes_agudas(texto: str) -> str:
    """Quita las tildes del español (á, é…) pero deja el circunflejo, que en
    miskito marca una vocal larga y cambia la palabra (S8)."""
    partes = unicodedata.normalize("NFD", texto)
    partes = "".join(c for c in partes if not (unicodedata.combining(c) and c != CIRCUNFLEJO))
    return unicodedata.normalize("NFC", partes)


def escritura(texto: str) -> str:
    """La forma escrita, limpia y con las convenciones que no cambian el sonido
    unificadas. Es lo que se le pide al modelo que encuentre en el audio."""
    t = _sin_tildes_agudas(texto.lower())
    t = re.sub(r"[^\w\s]|_", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    # S8: Tangni marca la vocal larga duplicándola (lii); el diccionario, con
    # circunflejo (lî). Son lo mismo.
    t = re.sub(r"([aiu])\1", lambda m: LARGAS[m.group(1)], t)
    # S2: la y final suena i (aisaby, duary).
    t = re.sub(r"y\b", "i", t)
    # S5: la ch de «matchip» es t + s.
    t = t.replace("tch", "ts").replace("ch", "ts")
    return t


def comparable(texto: str) -> str:
    """Lo que queda después de borrar todo lo que, según la gramática, no
    distingue palabras. Dos textos con el mismo `comparable` son la misma
    palabra para Piko."""
    t = escritura(texto)
    # S1: sólo hay tres vocales; una i que suena [e] o una u que suena [o] no
    # es un error.
    t = t.replace("e", "i").replace("o", "u")
    # S3: la h (y la g que algunos escriben en su lugar) junto a una consonante
    # cambia de lugar según quién escribe: mihta = mitha, walhwal = walg walg.
    # Y S4: la g de ng tampoco cuenta, que delante de k se oye casi n
    # (tingki, Tignki, Tinki). La g de «galila» o «gul», entre vocales o al
    # empezar, sí se queda.
    t = t.replace("h", "")
    t = re.sub(r"(?<=[^aiuâîû\s])g|g(?=[^aiuâîû\s]|$)", "", t)
    # S7 (confianza C): antes de «ai», la l se puede decir y (laiksna, yaiksna).
    t = re.sub(r"\bl(?=ai)", "y", t)
    # S6: dónde termina una palabra todavía no está fijo (utla ra / utlara).
    return t.replace(" ", "")


def parecido(oido: str, esperado: str) -> float:
    """De 0 a 1: cuánto se parece lo que transcribió el modelo a lo esperado,
    después de aplicar las reglas de arriba."""
    a, b = comparable(oido), comparable(esperado)
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(None, a, b).ratio()


def letras_a_evaluar(forma: str) -> list[tuple[str, bool]]:
    """Las letras de `forma` en orden, cada una con si cuenta para la nota.

    Todas se alinean contra el audio, porque el modelo tiene que ubicarlas para
    ubicar las demás. Pero la h y la g junto a consonante no se califican (S3):
    nadie se pone de acuerdo en dónde van, y castigarlas sería castigar una
    ortografía."""
    t = escritura(forma).replace(" ", "|")
    vocal = "aiuâîûeo"
    salida = []
    for i, c in enumerate(t):
        antes = t[i - 1] if i > 0 else "|"
        despues = t[i + 1] if i + 1 < len(t) else "|"
        if c in "|h":
            cuenta = False
        elif c == "g":
            # Igual que en `comparable`: la g junto a consonante, o al final.
            cuenta = (antes in vocal or antes == "|") and despues in vocal
        else:
            cuenta = True
        salida.append((c, cuenta))
    return salida


# Cuánto le pide Piko al chico, de más suelto a más estricto.
#
#   puntaje   promedio de la seguridad del modelo, letra por letra
#   parecido  cuánto se parece lo que transcribió solo, sin pistas
#   minimo    la letra más floja
#
# La letra más floja sólo cuenta en «estricta». Medido con voces reales, una
# sola letra en cero es común aunque la palabra se entienda: en «yul plun pisa»
# la n de «plun» se oye m porque viene una p, y el modelo la marca en cero. Eso
# lo hace cualquier hablante; no es pronunciar distinto.
EXIGENCIAS = {
    "suave":    {"puntaje": 0.50, "parecido": 0.70, "minimo": 0.0},
    "normal":   {"puntaje": 0.65, "parecido": 0.80, "minimo": 0.0},
    "estricta": {"puntaje": 0.80, "parecido": 0.80, "minimo": 0.30},
}


def veredicto(puntaje: float, minimo: float, sim: float, exigencia: str = "normal") -> str:
    """«bien» o «casi». Nunca «mal»: lo que no llega es un intento (ver
    app/src/ui/piko/frases.ts)."""
    u = EXIGENCIAS.get(exigencia, EXIGENCIAS["normal"])
    if exigencia == "estricta":
        ok = puntaje >= u["puntaje"] and sim >= u["parecido"] and minimo >= u["minimo"]
    else:
        ok = puntaje >= u["puntaje"] or sim >= u["parecido"]
    return "bien" if ok else "casi"
