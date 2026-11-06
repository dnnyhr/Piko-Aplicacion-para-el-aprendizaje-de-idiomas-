"""
El oído de Piko como servicio, para que el puente le pregunte.

    python servidor.py                     # en 127.0.0.1:4710
    python servidor.py --puerto 4720

    GET  /salud                            ¿ya cargó el modelo?
    POST /evaluar?formas=[...]&exigencia=normal
         cuerpo: un WAV PCM de 16 bits     → JSON con lo que oyó y la nota

Escucha sólo en 127.0.0.1: el que habla con los navegadores es el puente
(robot/panel/server.js), que valida lo que llega y reenvía. Este proceso no
tiene que quedar a la vista de la red del aula.

El modelo tarda en cargar (unos segundos y casi 4 GB). Se carga aparte, así
`/salud` contesta desde el principio y el panel puede mostrar «cargando» en vez
de nada.
"""

from __future__ import annotations

import argparse
import json
import os
import threading
import warnings
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

warnings.filterwarnings("ignore")
AQUI = Path(__file__).parent
os.environ.setdefault("HF_HOME", str(AQUI / "modelos"))

from comparar import EXIGENCIAS  # noqa: E402  (después de fijar HF_HOME)

LARGO_MAXIMO = 4 * 1024 * 1024     # ~2 min de WAV a 16 kHz: de sobra para una palabra
FORMAS_MAXIMAS = 6

estado = {"listo": False, "error": None, "modelo": None, "carga_s": None}
oido = None
turno = threading.Lock()          # el modelo atiende de a uno


def cargar():
    global oido
    try:
        from oido import MODELO, IDIOMA, Oido
        estado["modelo"] = f"{MODELO} ({IDIOMA})"
        oido = Oido()
        estado["carga_s"] = round(oido.segundos_de_carga, 1)
        estado["listo"] = True
        print(f"Oído listo: {estado['modelo']} en {estado['carga_s']} s", flush=True)
    except Exception as e:  # sin modelo descargado, sin memoria…
        estado["error"] = str(e)
        print(f"No se pudo cargar el oído: {e}", flush=True)


class Atender(BaseHTTPRequestHandler):
    def _json(self, codigo, datos):
        cuerpo = json.dumps(datos, ensure_ascii=False).encode()
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def do_GET(self):
        if urlparse(self.path).path == "/salud":
            return self._json(200, estado)
        self._json(404, {"error": "no está"})

    def do_POST(self):
        url = urlparse(self.path)
        if url.path != "/evaluar":
            return self._json(404, {"error": "no está"})
        if not estado["listo"]:
            return self._json(503, {"error": estado["error"] or "el modelo todavía está cargando"})

        q = parse_qs(url.query)
        try:
            formas = json.loads(q.get("formas", ["[]"])[0])
            assert isinstance(formas, list) and formas and all(isinstance(f, str) for f in formas)
        except Exception:
            return self._json(400, {"error": "formas tiene que ser una lista de textos"})
        formas = [f[:80] for f in formas[:FORMAS_MAXIMAS] if f.strip()]
        exigencia = q.get("exigencia", ["normal"])[0]
        if exigencia not in EXIGENCIAS:
            exigencia = "normal"

        largo = int(self.headers.get("Content-Length") or 0)
        if not 44 < largo <= LARGO_MAXIMO:
            return self._json(400, {"error": "falta el audio o es demasiado largo"})
        wav = self.rfile.read(largo)

        try:
            with turno:
                resultado = oido.evaluar(wav, formas, exigencia)
        except Exception as e:
            return self._json(400, {"error": f"no se pudo evaluar: {e}"})
        print(f"«{' / '.join(formas)}» → oyó «{resultado.get('oyo', '')}»: {resultado['veredicto']}", flush=True)
        self._json(200, resultado)

    def log_message(self, *args):  # el puente ya lleva su propio registro
        pass


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--puerto", type=int, default=4710)
    args = ap.parse_args()
    threading.Thread(target=cargar, daemon=True).start()
    print(f"Oído en http://127.0.0.1:{args.puerto} (cargando el modelo…)", flush=True)
    HTTPServer(("127.0.0.1", args.puerto), Atender).serve_forever()
