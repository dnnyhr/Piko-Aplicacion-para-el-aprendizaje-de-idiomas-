"""Las reglas de `comparar.py`, sin modelo y sin micrófono.

    python -m unittest prueba_comparar

Los pares salen de cómo escribieron lo mismo Teacher Smith, Tangni y el
diccionario publicado (diccionario/miskito/gramatica.md).
"""

import unittest

from comparar import comparable, escritura, letras_a_evaluar, parecido, veredicto


class LaMismaPalabra(unittest.TestCase):
    def igual(self, a, b):
        self.assertEqual(comparable(a), comparable(b), f"«{a}» y «{b}» tendrían que contar igual")

    def distinta(self, a, b):
        self.assertNotEqual(comparable(a), comparable(b), f"«{a}» y «{b}» no son la misma palabra")

    def test_s1_tres_vocales(self):
        self.igual("bila", "bela")
        self.igual("kuku", "koko")

    def test_s2_y_final(self):
        self.igual("aisaby", "aisabi")

    def test_s3_la_h_cambia_de_lugar(self):
        self.igual("mihta", "mitha")
        self.igual("luhpi waitna", "lupha waitna".replace("pha", "phi"))
        self.igual("walhwal", "walg walg")
        self.igual("yumpha", "yumgpa")
        self.igual("nahkisma", "naki sma")

    def test_s4_ng(self):
        self.igual("tingki", "Tignki")
        self.igual("tingki", "Tinki")

    def test_la_g_de_verdad_se_queda(self):
        self.distinta("galila", "alila")

    def test_s5_ch(self):
        self.igual("matchip", "matsip")

    def test_s6_donde_termina_la_palabra(self):
        self.igual("utla ra", "utlara")
        self.igual("kuki ki", "kukiki")

    def test_s7_l_y_antes_de_ai(self):
        self.igual("laiksna", "yaiksna")

    def test_s8_la_vocal_larga_cambia_la_palabra(self):
        self.distinta("kati", "kâti")
        self.igual("lî", "lii")
        self.igual("Lî", "lî")

    def test_tildes_del_espanol_no_cuentan(self):
        self.igual("kákamuk", "kakamuk")


class Letras(unittest.TestCase):
    def test_la_h_se_alinea_pero_no_se_califica(self):
        letras = letras_a_evaluar("mihta")
        self.assertEqual("".join(c for c, _ in letras), "mihta")
        self.assertEqual([c for c, cuenta in letras if cuenta], ["m", "i", "t", "a"])

    def test_la_g_de_ng_no_se_califica(self):
        self.assertNotIn("g", [c for c, cuenta in letras_a_evaluar("tingki") if cuenta])

    def test_el_espacio_es_separador(self):
        self.assertIn(("|", False), letras_a_evaluar("titan yamni"))

    def test_la_larga_se_califica(self):
        self.assertIn(("â", True), letras_a_evaluar("kâti"))

    def test_escritura_unifica(self):
        self.assertEqual(escritura("Lii."), "lî")
        self.assertEqual(escritura("matchip"), "matsip")


class Veredicto(unittest.TestCase):
    def test_parecido(self):
        self.assertEqual(parecido("titan yamni", "titan yamni"), 1.0)
        self.assertEqual(parecido("", "yul"), 0.0)

    def test_nunca_mal(self):
        for p in (0, 0.3, 0.6, 1):
            self.assertIn(veredicto(p, p, p), ("bien", "casi"))

    def test_la_exigencia_sube_la_vara(self):
        self.assertEqual(veredicto(0.55, 0.3, 0.5, "suave"), "bien")
        self.assertEqual(veredicto(0.55, 0.3, 0.5, "normal"), "casi")
        self.assertEqual(veredicto(0.7, 0.3, 0.5, "normal"), "bien")
        self.assertEqual(veredicto(0.7, 0.3, 0.5, "estricta"), "casi")

    def test_una_letra_en_cero_no_tumba_la_palabra(self):
        # «yul plun pisa» real: la n de plun se oye m delante de la p.
        self.assertEqual(veredicto(0.81, 0.0, 0.82, "normal"), "bien")
        self.assertEqual(veredicto(0.81, 0.0, 0.82, "estricta"), "casi")


if __name__ == "__main__":
    unittest.main()
