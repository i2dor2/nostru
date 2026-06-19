# Nostru

Identidad Nostr. Bitcoin Silent Payments. Una clave.

> _"Nostru" es la palabra rumana para "nuestro" - tus claves, tu identidad._

Un cliente social Nostr construido como extension de navegador (Chrome MV3). Permite leer y escribir en la red Nostr, enviar zaps con un clic via NWC, y recibir Bitcoin mediante Silent Payments - todo sin salir del navegador.

---

## Que hace

| Funcion | Descripcion |
|---------|-------------|
| **Feed social** | Feed de inicio via modelo outbox de Nostr (NDK), con respuestas, reacciones, reposts y zaps |
| **Perfiles** | Ver cualquier perfil Nostr, seguir/dejar de seguir, ver conteo de seguidores |
| **Busqueda** | Busqueda de texto completo en notas, perfiles y articulos, con filtros de autor y fecha |
| **Mensajes directos** | Mensajes cifrados NIP-04 y NIP-44 (kind 4 / 1059) |
| **Billetera NWC** | Zaps Lightning con un clic via Nostr Wallet Connect; visualizacion de saldo |
| **Listas de bloqueo/silencio** | Lista de silencio NIP-51 (kind 10000), publicada en relays; lista de bloqueo local |
| **Puente NIP-07** | Actua como firmante Nostr estilo web3 para dApps; sistema de permisos por sitio |
| **Direcciones NSP** | Deriva una direccion BIP-352 Silent Payment de cualquier clave publica Nostr - sin necesidad de consentimiento del destinatario |
| **Escaneo NSP** | Detecta Silent Payments de Bitcoin entrantes via host nativo local (sin exposicion de claves en la nube) |
| **Barrido NSP** | Construye y opcionalmente transmite una transaccion de barrido firmada completamente de forma local |
| **Notificaciones** | Sondeo en segundo plano de menciones, zaps y DMs; notificaciones del sistema |

---

## Que NO hace

| Que | Por que |
|-----|---------|
| Almacenar claves privadas permanentemente | Las claves viven solo en `chrome.storage.session` (borradas al cerrar el navegador) |
| Enviar tu clave de escaneo a ningun servidor | La clave privada de escaneo se deriva en memoria en la extension y se pasa unicamente al proceso nativo local via Chrome Native Messaging - nunca por la red |
| Requerir cuenta para mostrar direcciones NSP | Cualquier npub es suficiente para calcular la direccion Silent Payment de alguien |
| Transmitir transacciones automaticamente | La transmision es siempre una accion explicita del usuario mediante un boton dedicado |
| Recopilar telemetria | Cero analiticas, cero balizas, cero scripts de terceros |
| Usar escaneo en la nube | El escaneo se ejecuta localmente via `host.py` usando un servidor de indice configurado por el usuario solo para datos de bloques (tweaks), nunca para claves privadas |
| Exponer el historial de transacciones | Los outputs de Silent Payment son desvinculables en cadena; sin reutilizacion de xpub ni direcciones |

---

## Cada cuenta Nostr es un receptor de Bitcoin Silent Payment

Las identidades Nostr son pares de claves secp256k1 - la misma curva eliptica que usa Bitcoin. BIP-352 (Silent Payments) tambien esta construido sobre secp256k1. Esto significa que la derivacion no es un truco ni una solucion alternativa: es una consecuencia matematica directa de la aritmetica de curva compartida.

La derivacion de cualquier clave publica Nostr (`npub`) a una direccion Silent Payment (`sp1...`) funciona asi:

| Paso | Operacion | Quien puede hacerlo |
|------|-----------|---------------------|
| 1 | Tomar la clave publica Nostr x-only (32 bytes, Y-par segun BIP-340) | Cualquiera |
| 2 | Calcular `ScanPub = P + tagged_hash("nostr-sp/scan", P_compressed) * G` | Cualquiera |
| 3 | Calcular `SpendPub = P + tagged_hash("nostr-sp/spend", P_compressed) * G` | Cualquiera |
| 4 | Codificar como `sp1... = bech32m([0x00] + ScanPub_33 + SpendPub_33)` | Cualquiera |
| 5 | Detectar pagos entrantes (derivar `scan_priv`, escanear bloques via ECDH) | Solo el titular del nsec |
| 6 | Gastar fondos recibidos (derivar `spend_priv + t_k`, firmar tx de barrido) | Solo el titular del nsec |

La propiedad clave: los pasos 1-4 requieren solo la clave publica y son deterministicos. **Cualquiera que pueda encontrar tu npub puede pagarte, sin pedir jamas una direccion, sin que estes en linea, y sin ningun enlace en cadena entre dos pagos hacia ti.**

Esto significa:

- **Cada usuario Nostr ya es un receptor de Bitcoin SP**, lo sepa o no. La direccion existe en el momento en que existe el par de claves.
- **El grafo social de Nostr se duplica como directorio de pagos Bitcoin.** Si sigues a alguien, puedes pagarle silenciosamente con solo ver su perfil, sin que haya compartido jamas una direccion Bitcoin.
- **Los pagos sobreviven a la rotacion de claves.** Un remitente calcula la direccion una vez a partir del npub y los UTXOs resultantes son indistinguibles de cualquier otro output P2TR en cadena - sin reutilizacion de direcciones, sin agrupacion, sin vinculacion entre remitentes.
- **El destinatario no necesita estar ejecutando Nostru.** Cualquier billetera compatible con BIP-352 puede enviar a una direccion sp1 derivada de un npub. El destinatario puede escanear despues con Nostru cuando lo desee.

Nostru hace esto visible: abre cualquier perfil en la extension y la direccion `sp1...` aparece automaticamente, calculada en vivo en tu navegador a partir de nada mas que la clave publica de la cuenta.

---

## Ventajas y desventajas

NSP es potente pero no neutral. Estas son las ventajas y desventajas honestas.

**Ventajas**

| Lo que ganas | Por que importa |
|-------------|----------------|
| Cero configuracion para el receptor | La direccion SP existe en el momento en que existe el par de claves. El receptor no necesita estar en linea, ejecutar software ni conocer NSP. |
| Alcance universal | Cada usuario de Nostr ya es un receptor de Bitcoin. No se requiere registro. |
| Desvinculabilidad on-chain | Multiples pagos al mismo npub producen outputs P2TR sin correlacion. El analisis en cadena no puede agruparlos. |
| Sin reutilizacion de direcciones | Cada pago produce un output unico via ECDH. |
| Grafo social como directorio de pagos | Sigue a alguien en Nostr, pagale silenciosamente - sin intercambio de direcciones. |
| Sin custodio, sin canal | A diferencia de Lightning, no se requiere liquidez de canal ni nodo en linea. |

**Desventajas**

| Lo que cedes | Por que importa |
|-------------|----------------|
| Consentimiento del receptor | Puedes recibir Bitcoin de cualquiera - incluidas direcciones sancionadas o fondos ilegales - sin saberlo. En algunas jurisdicciones esto crea exposicion legal. Tim Bouma llamo a esto **culpabilidad del receptor** (receiver culpability). |
| Deniabilidad del remitente | Si el receptor revela su identidad real (por ejemplo, es doxxeado), el pago del remitente queda permanentemente vinculado a esa persona. Tim Bouma llamo a esto **trampa del donante** (donor entrapment). |
| Sin opt-out sin rotar claves | El mapeo npub-a-SP es permanente. Para dejar de recibir hay que rotar el npub, lo que rompe el grafo social. |
| Sensibilidad del scan key | La clave privada de escaneo es equivalente al nsec. Una clave de escaneo comprometida significa vigilancia de por vida de todos los outputs SP entrantes. |
| El escaneo requiere software local | Nostru necesita un proceso Python local para el escaneo ECDH. |
| Dependencia del servidor de indice | El escaneo requiere datos de tweak por bloque de un servidor de indice. |
| Seguimiento del birthday height | Sin registrar la altura inicial puede ser necesario escanear desde mucho antes. |

La tension central, como Tim Bouma la describio: un protocolo que elimina la friccion para los remitentes simultaneamente elimina la agencia de los receptores.

---

## Por que una extension y no un sitio web

El escaneo de Silent Payment requiere acceso a una clave privada de escaneo equivalente a tu clave privada Nostr. Un sitio web - incluso uno servido sobre HTTPS o desde localhost - no puede manejar esto de forma segura. Una extension de navegador si puede.

| Capacidad | Extension | Sitio web |
|-----------|-----------|-----------|
| Almacenamiento de claves en memoria inaccesible para scripts de pagina | `chrome.storage.session` | Sin equivalente; las variables JS son alcanzables por cualquier script inyectado |
| Comunicacion con un proceso nativo local | `chrome.runtime.connectNative()` | No disponible - esta API es solo para extensiones |
| Inyectar un firmante NIP-07 en cada pagina | Content scripts con acceso al mundo `MAIN` | Requeriria una extension de navegador igualmente |
| Ejecutar tareas en segundo plano sin pestaña visible | Service worker + `chrome.alarms` | Requiere servidor o pestaña siempre abierta |
| Panel lateral junto a cualquier pagina web | `chrome.sidePanel` | Imposible sin una extension |
| Sistema de permisos por origen para acceso a claves | `chrome.permissions` + almacen personalizado | Sin equivalente estandar |

**El bloqueador critico para un sitio web que hace NSP es Native Messaging.** `chrome.runtime.connectNative()` solo es invocable desde service workers de extension y paginas de extension - no desde ningun origen web, ni siquiera `localhost`. No hay solucion alternativa.

Sin Native Messaging, un sitio web que haga escaneo NSP tiene exactamente dos opciones:

1. **Enviar la clave de escaneo a un servidor.** La clave privada de escaneo es `nsec + tagged_hash(...)` - quien la tenga puede monitorear cada output de Silent Payment dirigido a ti, para siempre. Darla a un servidor convierte un protocolo de pago que preserva la privacidad en una herramienta de vigilancia.

2. **Escanear en la pestaña del navegador con JavaScript.** El escaneo BIP-352 requiere multiplicacion escalar secp256k1 para cada transaccion en cada bloque desde la altura de nacimiento. Para transacciones tipicas de red (miles de transacciones por bloque, cientos de bloques a escanear), esto tomaria horas en una pestaña del navegador - y se detendria en el momento en que la pestaña se cerrara.

El modelo de extension resuelve ambos problemas limpiamente:

- El service worker en segundo plano deriva `scan_priv` en memoria desde el `nsec` almacenado en sesion.
- Pasa la clave directamente al proceso local `host.py` via una tuberia Unix (Chrome Native Messaging). La tuberia es privada para el par de procesos del SO.
- `host.py` realiza el computo ECDH localmente, consulta solo los datos de tweak por bloque (no la clave) del servidor de indice, y devuelve solo los UTXOs coincidentes.
- La clave de escaneo nunca se escribe en ninguna parte. Si el navegador se cierra a mitad del escaneo, desaparece.

Esto solo es posible porque la extension tiene `chrome.runtime.connectNative()`. Un sitio web, una PWA y una aplicacion web local servida desde `file://` o `localhost` carecen de esta capacidad.

---

## Por que Nostru es una novedad absoluta

**Ninguna extension de navegador habia combinado nunca una identidad social Nostr con Bitcoin Silent Payments.**

La innovacion clave es el protocolo NSP (Nostr Silent Payments):

1. **Una clave, dos redes.** Tu clave privada Nostr (`nsec`) es un escalar secp256k1 - la misma curva que usa Bitcoin. Nostru deriva claves BIP-352 de escaneo y gasto a partir de ella usando hashes etiquetados con separacion de dominio (`nostr-sp/scan`, `nostr-sp/spend`), de modo que tu unica clave de identidad se convierte en tu clave de recepcion de Bitcoin.

2. **Paga a cualquier usuario Nostr, de forma privada.** Cualquiera que conozca tu npub puede calcular tu direccion Silent Payment (`sp1...`) sin preguntarte - y sin crear un enlace entre dos pagos en cadena. Un remitente no puede saber si recibiste el pago mirando la blockchain. Ni nadie mas que lo observe.

3. **La clave de escaneo nunca sale de tu dispositivo.** La clave privada de escaneo es equivalente a la raiz de tu nsec. Nostru lo maneja via Chrome Native Messaging: el service worker en segundo plano deriva la clave en memoria y la pasa directamente a un proceso Python local (`host.py`) a traves de una tuberia Unix. La clave nunca se escribe en disco, nunca se registra, nunca se envia por red.

4. **No se requiere nodo blockchain.** El escaneo usa un servidor de indice ligero (configurable por el usuario) que proporciona tweaks precomputados por transaccion. El host local verifica la coincidencia criptografica y solo reporta los UTXOs que te pertenecen.

5. **Barrido completo sin firma de terceros.** El host local construye y firma la transaccion de barrido BIP-341 P2TR completamente en Python usando cero dependencias externas. La extension recibe la transaccion sin procesar y te permite transmitirla o copiarla para envio manual.

La combinacion - descubrimiento social via Nostr + pagos entrantes silenciosos + firma solo local - nunca habia existido en una sola extension de navegador.

---

## Creditos

La idea de mapear identidades Nostr a direcciones Bitcoin Silent Payment fue articulada por **Tim Bouma** (GitHub: trbouma, Nostr: @trbouma). Su nota sobre culpabilidad del receptor y trampa del donante en NSP (https://gist.github.com/trbouma/77648ebe1005b181b67d1c4b42c7f31d) es el fundamento intelectual de este proyecto: identifico tanto el poder del mapeo (cada npub ya es un receptor Bitcoin) como su tension sin resolver (consentimiento, culpabilidad, trampa). Nostru es una implementacion de esa idea con una arquitectura de mensajeria nativa local que elimina el problema de exposicion del scan key.

---

## Arquitectura

```
Navegador (Chrome MV3)
  sidepanel.html          <- Interfaz React
      WalletScreen        <- Controles NWC + NSP
      ProfileView         <- muestra direccion sp1 derivada para cualquier npub
  background.ts           <- service worker
      Puente NIP-07       <- firmante web para dApps
      Sondeo notificaciones <- DMs, zaps, menciones
      Manejador SP        <- deriva claves en memoria, llama al host nativo
         |
         | Chrome Native Messaging (stdin/stdout, prefijo longitud LE 4 bytes)
         v
  host.py (proceso local, sin acceso de red a claves)
      identify            <- verificacion de version y capacidades
      scan                <- escaneo ECDH BIP-352 sobre tweaks del servidor de indice
      sweep               <- construccion de tx BIP-341 P2TR + firma Schnorr
```

---

## Silent Payments - Como usar

### Paso 1 - Instalar el host nativo

La logica de escaneo y firma se ejecuta como script Python local. No tiene dependencias externas (stdlib pura Python 3.9+).

```bash
git clone https://github.com/i2dor/nostru
cd nostru/tools/nostru-sp
python3 install.py --extension-id=<TU_ID_DE_EXTENSION>
```

Encuentra tu ID de extension en `chrome://extensions` (activa el modo desarrollador). La pantalla de Billetera lo muestra automaticamente en el asistente de configuracion.

Para verificar la instalacion:

```bash
python3 install.py --verify
```

Para desinstalar:

```bash
python3 install.py --uninstall
```

### Paso 2 - Desbloquear Nostru

Inicia sesion con tu nsec. La clave privada vive solo en el almacenamiento de sesion y se usa para derivar las claves de escaneo y gasto bajo demanda.

### Paso 3 - Escanear pagos

Abre la pantalla de Billetera, expande "Silent Payments (NSP)", y completa:

| Campo | Que introducir |
|-------|---------------|
| Servidor de indice SP | URL de un indice BIP-352 (predeterminado: silentpayments.xyz/api) |
| Altura de nacimiento | La altura de bloque desde la que empezar a escanear (usa la altura cuando compartiste por primera vez tu direccion sp1) |
| Altura punta | Limite superior opcional; deja en blanco para el predeterminado del servidor |

Haz clic en **Escanear pagos**. El host local consulta el servidor de indice para tweaks por bloque y realiza ECDH contra tu clave de escaneo para encontrar outputs P2TR coincidentes. No se envia informacion de clave privada al servidor de indice.

### Paso 4 - Barrer

Una vez encontrados los UTXOs, introduce una direccion Bitcoin de destino y una tasa de comision (sat/vB), luego haz clic en **Construir transaccion de barrido**. El host local:

1. Deriva el escalar de gasto por output (`b_spend + t_k mod n`)
2. Calcula el sighash BIP-341 para cada input
3. Firma con BIP-340 Schnorr usando un valor aux aleatorio
4. Devuelve la transaccion sin procesar serializada

Luego puedes:
- **Copiar TX sin procesar** - pegar en cualquier herramienta de transmision Bitcoin
- **Transmitir** - envia directamente a mempool.space/api/tx

---

## Recibir pagos NSP (compartir tu direccion)

Tu direccion Silent Payment es visible en tu propia tarjeta de perfil en la extension. Tambien puedes calcular la direccion sp1 de cualquier otro usuario a partir de su npub - aparece automaticamente en la vista de su perfil.

Comparte tu direccion sp1 igual que compartirias cualquier direccion Bitcoin. Los remitentes usan una billetera compatible con BIP-352 estandar; no necesitan saber nada sobre Nostr.

---

## Prueba con una cuenta desechable

La forma mas segura de verificar el flujo completo (derivar, recibir, escanear, barrer) sin arriesgar fondos reales ni vincular con tu identidad principal.

### Lo que necesitas

- Nostru instalado y el host nativo configurado (ver Paso 1 arriba)
- Una billetera compatible con BIP-352 para enviar (Cake Wallet en movil o silentpayments.xyz/send)
- Una pequena cantidad de Bitcoin mainnet (1000-5000 sat; por encima del limite de polvo)

Testnet no se recomienda - el indice NSP de silentpayments.xyz solo indexa mainnet.

### Paso a paso

**1. Generar un par de claves Nostr desechable**

```bash
npx nostr-tools@latest genkey
```

Anota la altura de bloque actual - este es tu birthday height.

**2. Cargar el par de claves en Nostru**

Abre la extension, haz clic en "Agregar cuenta", pega el nsec. NO publiques notas desde esta cuenta.

**3. Obtener la direccion SP**

En la pantalla de Wallet o tu propia tarjeta de perfil, la direccion `sp1...` aparece automaticamente.

**4. Enviar a la direccion SP**

Desde una billetera compatible con BIP-352, envia a la direccion `sp1...`. Anota:
- El ID de transaccion (txid)
- La altura de bloque en que se confirmo

**5. Escanear**

En la pantalla de Wallet, configura:
- **Servidor de indice SP**: `https://silentpayments.xyz/api` (por defecto)
- **Birthday height**: la altura del bloque del paso 1 (o el bloque de confirmacion del paso 4)
- Dejar el tip height en blanco

Haz clic en **Escanear pagos**. Si el pago confirmo, el UTXO correspondiente aparece.

**6. Barrer**

Introduce una direccion de destino y una tasa de comision, luego haz clic en **Construir transaccion de barrido**. Copia o transmite la transaccion.

### Que demuestra una prueba exitosa

| Verificacion | Lo que valida |
|-------------|--------------|
| Direccion sp1 derivada del npub desechable | Matematica de deriveScanPriv / deriveSpendPub correcta |
| Remitente usa billetera BIP-352 estandar | Las direcciones sp1 de Nostru son compatibles con el ecosistema |
| El escaneo encuentra el UTXO | ECDH del host nativo, consulta al servidor de indice y derivacion de claves funcionan de extremo a extremo |
| El barrido se confirma | La firma BIP-341 P2TR y la firma Schnorr son correctas |

---

## Configuracion de relays

Los relays predeterminados estan listados en `src/core/ndk/config.ts`. Puedes agregar o eliminar relays desde Configuracion. Los cambios surten efecto de inmediato.

---

## Permisos

| Permiso | Por que |
|---------|---------|
| `storage` | Guardar cuentas, relays, bloqueos, silencios, URI NWC |
| `sidePanel` | Abrir como barra lateral o pestana nueva |
| `nativeMessaging` | Conectar al host local `nostru.sp` para escaneo/barrido Silent Payment |
| `notifications` | Notificaciones del sistema para menciones, zaps y DMs |
| `alarms` | Sondeo en segundo plano cada 5 minutos |
| `windows` | Abrir popup de aprobacion NIP-07 |
| `host_permissions: https://*/*` | Resolucion LNURL, NWC, obtencion de facturas Lightning |

---

## Compilar desde codigo fuente

```bash
npm install
npm run build        # produccion -> dist/chrome-mv3/
npm run dev          # modo dev con HMR
npm test             # tests unitarios vitest
```

Carga `dist/chrome-mv3/` como extension sin empaquetar en Chrome.

---

## Notas de seguridad

- **El nsec nunca sale del navegador.** La clave privada sin procesar se almacena en `chrome.storage.session` (solo memoria, borrada al cerrar el navegador) y solo la accede el service worker en segundo plano.
- **scan_priv y spend_priv se derivan bajo demanda** y se pasan unicamente al host nativo via stdin. Nunca se escriben en disco, nunca se registran, nunca se incluyen en ninguna solicitud de red.
- **El host nativo esta en sandbox.** Chrome Native Messaging limita al host a comunicarse unicamente con extensiones que listen su nombre en `allowed_origins`. La ruta del binario del host y el ID de extension permitido se establecen en el momento de la instalacion.
- **No hay secretos en este repositorio.** Los documentos de configuracion usan marcadores de posicion; los tests usan claves de prueba generadas.
- **La desvinculabilidad de outputs BIP-352** significa que incluso si el servidor de indice se ve comprometido, solo aprende que alguien escaneo un rango de bloques - no que outputs te pertenecen, porque el paso ECDH ocurre localmente.

---

## Como no doxxearte a ti mismo

Silent Payments rompen el analisis en cadena: dos pagos al mismo npub producen outputs sin relacion en la blockchain. Pero la correspondencia de tu npub a tu direccion SP es publica, determinista y permanente - no en la blockchain, sino en la capa de identidad. Si tu npub es tu identidad social publica, cualquier remitente que consulte tu perfil ya sabe que te esta pagando *a ti*.

Estos son los riesgos practicos y que hacer ante cada uno:

| Riesgo | Que se filtra | Medida |
|--------|--------------|--------|
| **El npub es tu identidad de pago** | Tu direccion SP puede ser calculada por cualquiera a partir de tu npub. Un nombre real, dominio NIP-05 o foto en tu perfil kind:0 vincula tu direccion de recepcion Bitcoin con esa identidad de forma permanente. | Publica solo lo que estes dispuesto a tener vinculado con tu direccion SP para siempre. |
| **Exposicion de IP en relays** | Cada relay registra tu IP junto a tu npub. Varios operadores pueden correlacionarte entre sesiones. | Enruta el trafico de relay a traves de Tor o una VPN. |
| **Servidor de indice SP** | El servidor de indice (por defecto: silentpayments.xyz) ve tu IP y tu rango de escaneo (bloque inicial hasta la punta). No ve tu clave privada ni que UTXOs te pertenecen. | Aloja tu propio indice o enruta las solicitudes a traves de Tor. Establece una URL de servidor personalizada en la pantalla de Wallet. |
| **Difusion de transacciones** | La difusion integrada envia la transaccion en bruto a mempool.space - ese endpoint ve tu IP y la transaccion. | Usa tu propio nodo Bitcoin o copia la TX en bruto y enviala a traves de Tor con una herramienta separada. |
| **NWC URI** | Tu URI `nostrwalletconnect://` es una credencial de portador. Quien la obtenga puede vaciar tu wallet hasta el limite de gasto configurado. | Nunca la publiques, hagas captura de pantalla ni la pegues en un documento compartido. Tratala con el mismo cuidado que tu nsec. |
| **Metadatos kind:0 son permanentes** | Nombre, imagen, NIP-05 y bio se publican en relays y quedan permanentemente vinculados a tu npub - y por tanto a tu direccion SP. | Revisa tu perfil antes de compartir tu direccion sp1 publicamente. |

**Separacion de identidades**

Para mayor privacidad, usa un par de claves dedicado a pagos:

1. Genera un segundo par de claves (`nsec2`) que nunca vincules a un perfil publico y nunca uses para notas sociales.
2. Deriva su direccion SP y comparte solo esa con remitentes especificos.
3. Usa Nostru con `nsec2` exclusivamente para escanear y hacer sweep.

La direccion SP derivada de `nsec2` es completamente independiente de tu npub social. Los remitentes necesitan el npub de pago o la direccion sp1 directamente - no pueden encontrarla en tu perfil publico.

**Lo que no puedes deshacer**

La correspondencia npub-a-direccion-SP es determinista y permanente. Si ya has publicado tu npub ampliamente, cualquier remitente puede calcular tu direccion SP y podra hacerlo de forma permanente. No existe mecanismo de rotacion excepto rotar el npub mismo.

---

## Contacto

Nostr: [npub17ph4attxued865ehp9j6dtfhpzj9az55wvur8dzq6t4y633qveuqvn9wf7](https://njump.me/npub17ph4attxued865ehp9j6dtfhpzj9az55wvur8dzq6t4y633qveuqvn9wf7)
