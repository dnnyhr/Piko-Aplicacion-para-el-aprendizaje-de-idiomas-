/**
 * Puente JS del módulo nativo `PikoRed` (ver `android/.../PikoRedModule.kt`).
 *
 * Sólo existe en Android. Se pide con `requireOptionalNativeModule` para que
 * una app sin el módulo (Expo Go, por ejemplo) diga "no hay red de aula" en
 * vez de cerrarse al arrancar.
 */

import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

export interface InfoWifi {
  interfaz: string | null;
  ip: string | null;
  prefijo: number | null;
  /** En un hotspot, la puerta de enlace **es** el teléfono del maestro. */
  puertaEnlace: string | null;
}

export interface InterfazLocal {
  nombre: string;
  ip: string;
  prefijo: number;
  difusion: string | null;
}

export interface InfoRed {
  wifi: InfoWifi | null;
  interfaces: InterfazLocal[];
}

type Eventos = {
  datos: (e: { id: number; texto: string }) => void;
  cierre: (e: { id: number }) => void;
  entrante: (e: { servidor: number; id: number; remoto: string }) => void;
};

export interface PikoRedNativo {
  conectar(host: string, puerto: number, timeoutMs: number): Promise<{ id: number; remoto: string }>;
  escuchar(puerto: number): Promise<{ id: number; puerto: number }>;
  cerrarServidor(id: number): void;
  leer(id: number): void;
  enviar(id: number, texto: string): void;
  cerrar(id: number): void;
  infoRed(): InfoRed;
  iniciarFaro(puerto: number, mensaje: string): void;
  detenerFaro(): void;
  buscarFaro(puerto: number, esperaMs: number): Promise<{ ip: string; mensaje: string } | null>;
  addListener<E extends keyof Eventos>(evento: E, cb: Eventos[E]): EventSubscription;
}

export const PikoRed = requireOptionalNativeModule<PikoRedNativo>('PikoRed');
