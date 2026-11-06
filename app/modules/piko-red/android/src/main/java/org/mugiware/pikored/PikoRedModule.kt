package org.mugiware.pikored

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.InputStreamReader
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.Inet4Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.net.SocketTimeoutException
import java.nio.charset.StandardCharsets
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

/**
 * La red del aula, hecha a mano para lo que Piko necesita y nada más.
 *
 * Por qué no una librería de sockets genérica:
 *
 *  - **El wifi del hotspot no tiene internet.** Android entonces deja los datos
 *    móviles como red por defecto, y un socket "normal" hacia 192.168.x.y sale
 *    por la antena del celular y nunca llega al maestro. Acá cada socket del
 *    estudiante se ata explícitamente a la red wifi (`Network.bindSocket`).
 *  - **Cada intento de conexión tiene un tiempo límite de verdad**, en el
 *    sistema operativo, y corre en su propio hilo. Probar una dirección que no
 *    existe no bloquea a las demás durante dos minutos.
 *  - **El teléfono del maestro conoce su propia dirección en el hotspot**, que
 *    `WifiInfo` no da (el maestro no está "conectado a un wifi": es el wifi).
 *  - **Un faro UDP**: el maestro anuncia la sala por difusión y contesta a quien
 *    pregunte, así el estudiante la encuentra sin barrer la red.
 *
 * Todo el texto viaja en UTF-8. El lector usa un `InputStreamReader`, que
 * nunca corta un carácter multibyte entre dos eventos.
 */
class PikoRedModule : Module() {
  private val hilos: ExecutorService = Executors.newCachedThreadPool()
  private val conexiones = ConcurrentHashMap<Int, Conexion>()
  private val servidores = ConcurrentHashMap<Int, ServerSocket>()
  private val siguiente = AtomicInteger(1)

  @Volatile private var faro: Faro? = null
  @Volatile private var candado: WifiManager.MulticastLock? = null
  private val usosCandado = AtomicInteger(0)

  private val contexto: Context
    get() = appContext.reactContext?.applicationContext
      ?: throw IllegalStateException("Piko: sin contexto de Android")

  override fun definition() = ModuleDefinition {
    Name("PikoRed")

    Events(EV_DATOS, EV_CIERRE, EV_ENTRANTE)

    // ---------------------------------------------------------------- TCP

    AsyncFunction("conectar") { host: String, puerto: Int, timeoutMs: Int, promise: Promise ->
      hilos.execute { conectar(host, puerto, timeoutMs, promise) }
    }

    AsyncFunction("escuchar") { puerto: Int, promise: Promise ->
      hilos.execute { escuchar(puerto, promise) }
    }

    Function("cerrarServidor") { id: Int ->
      val ss = servidores.remove(id)
      try {
        ss?.close()
      } catch (_: Exception) {
      }
    }

    /** Empieza a leer. JS lo llama recién cuando ya tiene sus oyentes puestos. */
    Function("leer") { id: Int ->
      conexiones[id]?.leer()
    }

    Function("enviar") { id: Int, texto: String ->
      conexiones[id]?.enviar(texto)
    }

    Function("cerrar") { id: Int ->
      conexiones[id]?.cerrar()
    }

    // ---------------------------------------------------------------- red

    Function("infoRed") {
      infoRed()
    }

    // ---------------------------------------------------------------- faro

    Function("iniciarFaro") { puerto: Int, mensaje: String ->
      detenerFaro()
      val nuevo = Faro(puerto, mensaje)
      faro = nuevo
      nuevo.iniciar()
    }

    Function("detenerFaro") {
      detenerFaro()
    }

    AsyncFunction("buscarFaro") { puerto: Int, esperaMs: Int, promise: Promise ->
      hilos.execute { buscarFaro(puerto, esperaMs, promise) }
    }

    OnDestroy {
      detenerFaro()
      for (c in conexiones.values) c.cerrarYa()
      conexiones.clear()
      for (s in servidores.values) {
        try {
          s.close()
        } catch (_: Exception) {
        }
      }
      servidores.clear()
      hilos.shutdownNow()
    }
  }

  // ==================================================================== TCP

  private inner class Conexion(val id: Int, val socket: Socket) {
    private val escritor: ExecutorService = Executors.newSingleThreadExecutor()
    private val cerrada = AtomicBoolean(false)
    private val leyendo = AtomicBoolean(false)
    val remoto: String = "${socket.inetAddress?.hostAddress ?: "?"}:${socket.port}"

    fun leer() {
      if (!leyendo.compareAndSet(false, true)) return
      try {
        hilos.execute {
          try {
            val lector = InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8)
            val buf = CharArray(8192)
            while (true) {
              val n = lector.read(buf)
              if (n < 0) break
              if (n > 0) emitir(EV_DATOS, mapOf("id" to id, "texto" to String(buf, 0, n)))
            }
          } catch (_: Exception) {
            // Se cortó: el cierre de abajo avisa a JS.
          }
          cerrarYa()
        }
      } catch (_: RejectedExecutionException) {
        cerrarYa()
      }
    }

    fun enviar(texto: String) {
      if (cerrada.get()) return
      val bytes = texto.toByteArray(StandardCharsets.UTF_8)
      try {
        escritor.execute {
          try {
            val salida = socket.getOutputStream()
            salida.write(bytes)
            salida.flush()
          } catch (_: Exception) {
            cerrarYa()
          }
        }
      } catch (_: RejectedExecutionException) {
      }
    }

    /**
     * Cierre amable: deja salir lo que ya estaba en cola (por ejemplo, el
     * "esa sala no es tuya" que el maestro manda justo antes de cortar).
     */
    fun cerrar() {
      try {
        escritor.execute { cerrarYa() }
      } catch (_: RejectedExecutionException) {
        cerrarYa()
        return
      }
      // Si la cola quedó trabada en una escritura a un socket muerto, se corta igual.
      try {
        hilos.execute {
          try {
            Thread.sleep(2000)
          } catch (_: InterruptedException) {
          }
          cerrarYa()
        }
      } catch (_: RejectedExecutionException) {
        cerrarYa()
      }
    }

    fun cerrarYa() {
      if (!cerrada.compareAndSet(false, true)) return
      conexiones.remove(id)
      try {
        socket.close()
      } catch (_: Exception) {
      }
      escritor.shutdown()
      emitir(EV_CIERRE, mapOf("id" to id))
    }
  }

  private fun conectar(host: String, puerto: Int, timeoutMs: Int, promise: Promise) {
    val socket = Socket()
    try {
      atarAWifi(socket)
      socket.tcpNoDelay = true
      socket.connect(InetSocketAddress(host, puerto), timeoutMs.coerceIn(200, 30_000))
      socket.keepAlive = true
      val id = siguiente.getAndIncrement()
      val c = Conexion(id, socket)
      conexiones[id] = c
      promise.resolve(mapOf("id" to id, "remoto" to c.remoto))
    } catch (e: Exception) {
      try {
        socket.close()
      } catch (_: Exception) {
      }
      promise.reject("ERR_PIKO_CONECTAR", "No se pudo conectar a $host:$puerto (${e.message})", e)
    }
  }

  private fun escuchar(puerto: Int, promise: Promise) {
    val ss: ServerSocket
    try {
      ss = ServerSocket()
      ss.reuseAddress = true
      // Todas las interfaces: el hotspot, el wifi, lo que haya.
      ss.bind(InetSocketAddress(puerto), 50)
    } catch (e: Exception) {
      promise.reject("ERR_PIKO_ESCUCHAR", "No se pudo abrir el puerto $puerto (${e.message})", e)
      return
    }

    val sid = siguiente.getAndIncrement()
    servidores[sid] = ss
    hilos.execute {
      while (!ss.isClosed) {
        try {
          val s = ss.accept()
          s.tcpNoDelay = true
          s.keepAlive = true
          val cid = siguiente.getAndIncrement()
          val c = Conexion(cid, s)
          conexiones[cid] = c
          emitir(EV_ENTRANTE, mapOf("servidor" to sid, "id" to cid, "remoto" to c.remoto))
        } catch (_: Exception) {
          if (ss.isClosed) break
          try {
            Thread.sleep(100)
          } catch (_: InterruptedException) {
            break
          }
        }
      }
    }
    promise.resolve(mapOf("id" to sid, "puerto" to ss.localPort))
  }

  // ==================================================================== red

  private fun conectividad(): ConnectivityManager =
    contexto.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

  /** La red wifi a la que está unido el teléfono, si hay una. */
  private fun redWifi(): Network? {
    return try {
      val cm = conectividad()
      @Suppress("DEPRECATION")
      cm.allNetworks.firstOrNull { n ->
        cm.getNetworkCapabilities(n)?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
      }
    } catch (_: Exception) {
      null
    }
  }

  private fun atarAWifi(socket: Socket) {
    val red = redWifi() ?: return
    try {
      red.bindSocket(socket)
    } catch (_: Exception) {
      // Sin permiso o la red se fue en este instante: se sigue con la ruta por defecto.
    }
  }

  private fun atarAWifi(socket: DatagramSocket) {
    val red = redWifi() ?: return
    try {
      red.bindSocket(socket)
    } catch (_: Exception) {
    }
  }

  private data class Direccion(val nombre: String, val ip: Inet4Address, val prefijo: Int, val difusion: InetAddress?)

  private fun direccionesLocales(): List<Direccion> {
    val lista = mutableListOf<Direccion>()
    try {
      val ifaces = NetworkInterface.getNetworkInterfaces() ?: return lista
      for (iface in ifaces) {
        try {
          if (!iface.isUp || iface.isLoopback) continue
          for (ia in iface.interfaceAddresses) {
            val ip = ia.address
            if (ip is Inet4Address && !ip.isLoopbackAddress && !ip.isLinkLocalAddress) {
              lista.add(Direccion(iface.name, ip, ia.networkPrefixLength.toInt(), ia.broadcast))
            }
          }
        } catch (_: Exception) {
        }
      }
    } catch (_: Exception) {
    }
    return lista
  }

  private fun infoRed(): Map<String, Any?> {
    var wifi: Map<String, Any?>? = null
    try {
      val red = redWifi()
      val lp = red?.let { conectividad().getLinkProperties(it) }
      if (lp != null) {
        val dir = lp.linkAddresses.firstOrNull { it.address is Inet4Address }
        var puerta = lp.routes
          .firstOrNull { it.isDefaultRoute && it.gateway is Inet4Address && !it.gateway!!.isAnyLocalAddress }
          ?.gateway?.hostAddress
        if (puerta == null) puerta = puertaPorDhcp()
        wifi = mapOf(
          "interfaz" to lp.interfaceName,
          "ip" to dir?.address?.hostAddress,
          "prefijo" to dir?.prefixLength,
          "puertaEnlace" to puerta,
        )
      }
    } catch (_: Exception) {
    }

    val interfaces = direccionesLocales().map {
      mapOf(
        "nombre" to it.nombre,
        "ip" to it.ip.hostAddress,
        "prefijo" to it.prefijo,
        "difusion" to it.difusion?.hostAddress,
      )
    }
    return mapOf("wifi" to wifi, "interfaces" to interfaces)
  }

  @Suppress("DEPRECATION")
  private fun puertaPorDhcp(): String? {
    return try {
      val wm = contexto.getSystemService(Context.WIFI_SERVICE) as WifiManager
      val g = wm.dhcpInfo?.gateway ?: 0
      if (g == 0) null
      else "${g and 0xff}.${(g shr 8) and 0xff}.${(g shr 16) and 0xff}.${(g shr 24) and 0xff}"
    } catch (_: Exception) {
      null
    }
  }

  /** Dónde difundir: la dirección de difusión de cada interfaz, y la general. */
  private fun destinosDifusion(): List<InetAddress> {
    val destinos = LinkedHashSet<InetAddress>()
    for (d in direccionesLocales()) {
      if (esCelular(d.nombre)) continue
      val b = d.difusion ?: calcularDifusion(d.ip, d.prefijo)
      if (b != null) destinos.add(b)
    }
    try {
      destinos.add(InetAddress.getByName("255.255.255.255"))
    } catch (_: Exception) {
    }
    return destinos.toList()
  }

  private fun esCelular(nombre: String): Boolean =
    nombre.startsWith("rmnet") || nombre.startsWith("ccmni") || nombre.startsWith("v4-") ||
      nombre.startsWith("pdp") || nombre.startsWith("dummy") || nombre.startsWith("tun")

  private fun calcularDifusion(ip: Inet4Address, prefijo: Int): InetAddress? {
    if (prefijo !in 1..30) return null
    val b = ip.address
    val n = ((b[0].toInt() and 0xff) shl 24) or ((b[1].toInt() and 0xff) shl 16) or
      ((b[2].toInt() and 0xff) shl 8) or (b[3].toInt() and 0xff)
    val mascara = -1 shl (32 - prefijo)
    val d = n or mascara.inv()
    return try {
      InetAddress.getByAddress(
        byteArrayOf((d shr 24).toByte(), (d shr 16).toByte(), (d shr 8).toByte(), d.toByte()),
      )
    } catch (_: Exception) {
      null
    }
  }

  private fun tomarCandado() {
    if (usosCandado.incrementAndGet() != 1) return
    try {
      val wm = contexto.getSystemService(Context.WIFI_SERVICE) as WifiManager
      val c = wm.createMulticastLock("piko-aula")
      c.setReferenceCounted(false)
      c.acquire()
      candado = c
    } catch (_: Exception) {
    }
  }

  private fun soltarCandado() {
    if (usosCandado.decrementAndGet() > 0) return
    usosCandado.set(0)
    try {
      candado?.release()
    } catch (_: Exception) {
    }
    candado = null
  }

  // ==================================================================== faro

  /**
   * El faro del maestro. Cada segundo difunde `mensaje` por todas las
   * interfaces, y a quien mande `PIKO?` le contesta directo.
   */
  private inner class Faro(val puerto: Int, val mensaje: String) {
    @Volatile var activo = true
    @Volatile var socket: DatagramSocket? = null

    fun iniciar() {
      tomarCandado()
      try {
        hilos.execute { bucle() }
      } catch (_: RejectedExecutionException) {
        soltarCandado()
      }
    }

    fun detener() {
      activo = false
      try {
        socket?.close()
      } catch (_: Exception) {
      }
    }

    private fun abrir(): DatagramSocket {
      return try {
        val s = DatagramSocket(null)
        s.reuseAddress = true
        s.broadcast = true
        s.bind(InetSocketAddress(puerto))
        s
      } catch (_: Exception) {
        // El puerto está tomado: al menos se difunde desde uno cualquiera.
        val s = DatagramSocket()
        s.broadcast = true
        s
      }
    }

    private fun bucle() {
      try {
        val s = abrir()
        socket = s
        s.soTimeout = 500
        val datos = mensaje.toByteArray(StandardCharsets.UTF_8)
        val buf = ByteArray(512)
        var ultimo = 0L
        while (activo) {
          val ahora = System.currentTimeMillis()
          if (ahora - ultimo >= 1000) {
            ultimo = ahora
            for (d in destinosDifusion()) {
              try {
                s.send(DatagramPacket(datos, datos.size, d, puerto))
              } catch (_: Exception) {
              }
            }
          }
          try {
            val p = DatagramPacket(buf, buf.size)
            s.receive(p)
            val txt = String(p.data, 0, p.length, StandardCharsets.UTF_8)
            if (txt.startsWith(PREGUNTA)) {
              s.send(DatagramPacket(datos, datos.size, p.address, p.port))
            }
          } catch (_: SocketTimeoutException) {
          } catch (_: Exception) {
            if (!activo) break
            try {
              Thread.sleep(200)
            } catch (_: InterruptedException) {
              break
            }
          }
        }
      } catch (_: Exception) {
      } finally {
        try {
          socket?.close()
        } catch (_: Exception) {
        }
        soltarCandado()
      }
    }
  }

  private fun detenerFaro() {
    faro?.detener()
    faro = null
  }

  /**
   * El estudiante pregunta "¿hay una sala?" por difusión y escucha los faros.
   * Devuelve la primera respuesta válida, o null si pasó el tiempo.
   */
  private fun buscarFaro(puerto: Int, esperaMs: Int, promise: Promise) {
    tomarCandado()
    var s: DatagramSocket? = null
    var resuelto = false
    try {
      val socket = try {
        val d = DatagramSocket(null)
        d.reuseAddress = true
        d.broadcast = true
        d.bind(InetSocketAddress(puerto))
        d
      } catch (_: Exception) {
        val d = DatagramSocket()
        d.broadcast = true
        d
      }
      s = socket
      atarAWifi(socket)
      socket.soTimeout = 250

      val destinos = LinkedHashSet<InetAddress>()
      try {
        val info = infoRed()
        @Suppress("UNCHECKED_CAST")
        val wifi = info["wifi"] as Map<String, Any?>?
        val ip = wifi?.get("ip") as String?
        val prefijo = wifi?.get("prefijo") as Int?
        val puerta = wifi?.get("puertaEnlace") as String?
        if (ip != null && prefijo != null) {
          val dir = InetAddress.getByName(ip)
          if (dir is Inet4Address) calcularDifusion(dir, prefijo)?.let { destinos.add(it) }
        }
        if (puerta != null) destinos.add(InetAddress.getByName(puerta))
      } catch (_: Exception) {
      }
      destinos.addAll(destinosDifusion())

      val pregunta = PREGUNTA.toByteArray(StandardCharsets.UTF_8)
      val buf = ByteArray(512)
      val fin = System.currentTimeMillis() + esperaMs.coerceIn(200, 20_000)
      var ultimoEnvio = 0L
      while (System.currentTimeMillis() < fin) {
        val ahora = System.currentTimeMillis()
        if (ahora - ultimoEnvio >= 600) {
          ultimoEnvio = ahora
          for (d in destinos) {
            try {
              socket.send(DatagramPacket(pregunta, pregunta.size, d, puerto))
            } catch (_: Exception) {
            }
          }
        }
        try {
          val p = DatagramPacket(buf, buf.size)
          socket.receive(p)
          val txt = String(p.data, 0, p.length, StandardCharsets.UTF_8)
          if (txt.startsWith(PREFIJO_FARO)) {
            resuelto = true
            promise.resolve(mapOf("ip" to p.address.hostAddress, "mensaje" to txt))
            return
          }
        } catch (_: SocketTimeoutException) {
        }
      }
    } catch (_: Exception) {
    } finally {
      try {
        s?.close()
      } catch (_: Exception) {
      }
      soltarCandado()
      if (!resuelto) promise.resolve(null)
    }
  }

  // ==================================================================== util

  private fun emitir(evento: String, cuerpo: Map<String, Any?>) {
    try {
      sendEvent(evento, cuerpo)
    } catch (_: Exception) {
      // La app se está cerrando.
    }
  }

  companion object {
    const val EV_DATOS = "datos"
    const val EV_CIERRE = "cierre"
    const val EV_ENTRANTE = "entrante"
    const val PREGUNTA = "PIKO?"
    const val PREFIJO_FARO = "PIKO1 "
  }
}
