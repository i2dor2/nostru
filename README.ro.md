# Nostru

Identitate Nostr. Bitcoin Silent Payments. O singura cheie.

> _"Nostru" inseamna "al nostru" in romana - cheile tale, identitatea ta._

Un client social Nostr construit ca extensie de browser (Chrome MV3). Permite citirea si scrierea in reteaua Nostr, trimiterea de zaps cu un singur clic prin NWC si primirea de Bitcoin prin Silent Payments - totul fara a parasi browserul.

---

## Ce face

| Functie | Descriere |
|---------|-----------|
| **Feed social** | Feed principal via modelul outbox Nostr (NDK), cu raspunsuri, reactii, reposturi si zaps |
| **Profiluri** | Vizualizarea oricarui profil Nostr, urmarire/anulare urmarire, numar de urmatori |
| **Cautare** | Cautare full-text in note, profiluri si articole, cu filtre de autor si data |
| **Mesaje directe** | Mesaje criptate NIP-04 si NIP-44 (kind 4 / 1059) |
| **Portofel NWC** | Zaps Lightning cu un clic via Nostr Wallet Connect; afisare sold |
| **Liste de blocare/ignorare** | Lista de ignorare NIP-51 (kind 10000), publicata pe relay-uri; lista de blocare locala |
| **Bridge NIP-07** | Actioneaza ca semnatar Nostr de tip web3 pentru dApp-uri; sistem de permisiuni per site |
| **Adrese NSP** | Deriveaza o adresa BIP-352 Silent Payment din orice cheie publica Nostr - fara acordul destinatarului |
| **Scanare NSP** | Detecteaza Silent Payments Bitcoin primite via un host nativ local (fara expunerea cheilor in cloud) |
| **Sweep NSP** | Construieste si optional transmite o tranzactie de sweep semnata complet local |
| **Notificari** | Sondare in fundal pentru mentiuni, zaps si DM-uri; notificari de sistem |

---

## Ce NU face

| Ce | De ce |
|----|-------|
| Stocarea permanenta a cheilor private | Cheile traiesc doar in `chrome.storage.session` (sterse la inchiderea browserului) |
| Trimiterea cheii de scanare la vreun server | Cheia privata de scanare este derivata in memorie in extensie si transmisa numai procesului nativ local via Chrome Native Messaging - niciodata prin retea |
| Necesita cont pentru a afisa adrese NSP | Orice npub este suficient pentru a calcula adresa Silent Payment a cuiva |
| Transmite tranzactii automat | Transmiterea este intotdeauna o actiune explicita a utilizatorului printr-un buton dedicat |
| Colecteaza telemetrie | Zero analize, zero beacon-uri, zero scripturi terte |
| Foloseste scanarea in cloud | Scanarea ruleaza local via `host.py` folosind un server de index configurat de utilizator doar pentru date de bloc (tweaks), niciodata pentru chei private |
| Expune istoricul tranzactiilor | Iesirile Silent Payment nu sunt corelabile on-chain; fara reutilizare de xpub sau adrese |

---

## Fiecare cont Nostr este un receptor de Bitcoin Silent Payment

Identitatile Nostr sunt perechi de chei secp256k1 - aceeasi curba eliptica pe care o foloseste Bitcoin. BIP-352 (Silent Payments) este construit tot pe secp256k1. Asta inseamna ca derivarea nu este un truc sau o solutie de compromis: este o consecinta matematica directa a aritmeticii comune pe curba.

Derivarea de la orice cheie publica Nostr (`npub`) la o adresa Silent Payment (`sp1...`) functioneaza astfel:

| Pas | Operatie | Cine poate face asta |
|-----|----------|----------------------|
| 1 | Se preia cheia publica Nostr x-only (32 bytes, Y-par conform BIP-340) | Oricine |
| 2 | Se calculeaza `ScanPub = P + tagged_hash("nostr-sp/scan", P_compressed) * G` | Oricine |
| 3 | Se calculeaza `SpendPub = P + tagged_hash("nostr-sp/spend", P_compressed) * G` | Oricine |
| 4 | Se codifica ca `sp1... = bech32m([0x00] + ScanPub_33 + SpendPub_33)` | Oricine |
| 5 | Detectarea platilor primite (derivare `scan_priv`, scanare blocuri via ECDH) | Doar detinatorul nsec |
| 6 | Cheltuirea fondurilor primite (derivare `spend_priv + t_k`, semnare tx sweep) | Doar detinatorul nsec |

Proprietatea cheie: pasii 1-4 necesita doar cheia publica si sunt deterministici. **Oricine iti poate gasi npub-ul te poate plati, fara a cere vreodata o adresa, fara sa fii online si fara nicio legatura on-chain intre doua plati catre tine.**

Asta inseamna ca:

- **Fiecare utilizator Nostr este deja un receptor de Bitcoin SP**, stie sau nu asta. Adresa exista in momentul in care exista perechea de chei.
- **Graful social Nostr se dubleaza ca director de plati Bitcoin.** Daca urmezi pe cineva, il poti plati in tacere direct din profilul lui - fara ca el sa fi impartasit vreodata o adresa Bitcoin.
- **Platile supravietuiesc rotatiei cheilor.** Un expeditor calculeaza adresa o data din npub, iar UTXO-urile rezultate sunt indistinguibile de orice alta iesire P2TR on-chain - fara reutilizare de adrese, fara grupare, fara corelare intre expeditori.
- **Destinatarul nu trebuie sa ruleze Nostru.** Orice portofel compatibil BIP-352 poate trimite la o adresa sp1 derivata dintr-un npub. Destinatarul poate scana mai tarziu cu Nostru oricand doreste.

Nostru face asta vizibil: deschide orice profil in extensie si adresa `sp1...` apare automat, calculata live in browserul tau din nimic altceva decat cheia publica a contului.

---

## Avantaje si dezavantaje

NSP este puternic dar nu neutru. Acestea sunt avantajele si dezavantajele oneste.

**Avantaje**

| Ce castigi | De ce conteaza |
|-----------|---------------|
| Zero configurare pentru receptor | Adresa SP exista in momentul in care exista perechea de chei. Receptorul nu trebuie sa fie online, sa ruleze software sau sa cunoasca NSP. |
| Acoperire universala | Fiecare utilizator Nostr este deja un receptor Bitcoin. Nu necesita inregistrare. |
| Decorelabilitate on-chain | Platile multiple catre acelasi npub produc iesiri P2TR fara corelatie. Analiza lantului nu le poate grupa. |
| Fara reutilizare de adrese | Fiecare plata produce o iesire unica via ECDH. |
| Graful social ca director de plati | Urmaresti pe cineva pe Nostr, il platesti silentios - fara schimb de adrese. |
| Fara custode, fara canal | Spre deosebire de Lightning, fara lichiditate de canal sau nod online necesar. |

**Dezavantaje**

| Ce cedezi | De ce conteaza |
|----------|---------------|
| Consimtamantul receptorului | Poti primi Bitcoin de la oricine - inclusiv adrese sanctionate sau fonduri ilegale - fara sa stii. In unele jurisdictii aceasta creeaza expunere legala. Tim Bouma a numit asta **culpabilitatea receptorului** (receiver culpability). |
| Negabilitatea expeditorului | Daca receptorul isi dezvaluie identitatea reala (ex. este doxxat), plata expeditorului ramane permanent legata de acea persoana. Tim Bouma a numit asta **capcana donatorului** (donor entrapment). |
| Fara opt-out fara rotarea cheilor | Maparea npub-la-adresa-SP este permanenta. Pentru a nu mai primi trebuie rotit npub-ul, ceea ce distruge graful social. |
| Sensibilitatea cheii de scanare | Cheia privata de scanare este echivalenta cu nsec. O cheie compromisa inseamna monitorizare pe viata a tuturor iesirilor SP primite. |
| Scanarea necesita software local | Nostru are nevoie de un proces Python local pentru scanarea ECDH. |
| Dependenta de serverul de index | Scanarea necesita date tweak per bloc de la un server de index. |
| Urmarirea birthday height | Fara inregistrarea inaltimii initiale poate fi necesara scanarea de la o inaltime mult anterioara. |

Tensiunea centrala, asa cum a descris-o Tim Bouma: un protocol care elimina frecarea pentru expeditori elimina simultan autonomia receptorilor.

---

## De ce o extensie si nu un site web

Scanarea Silent Payment necesita acces la o cheie privata de scanare care este echivalenta ca importanta cu cheia privata Nostr. Un site web - chiar si unul servit prin HTTPS sau din localhost - nu poate gestiona asta in siguranta. O extensie de browser poate.

| Capabilitate | Extensie | Site web |
|--------------|----------|----------|
| Stocare de chei in memorie inaccesibila scripturilor de pagina | `chrome.storage.session` | Nu exista echivalent; variabilele JS sunt accesibile oricarui script injectat |
| Comunicare cu un proces nativ local | `chrome.runtime.connectNative()` | Indisponibil - acest API este exclusiv pentru extensii |
| Injectarea unui semnatar NIP-07 in fiecare pagina | Content scripts cu acces la lumea `MAIN` | Ar necesita oricum o extensie de browser |
| Rularea de sarcini in fundal fara tab vizibil | Service worker + `chrome.alarms` | Necesita server sau tab intotdeauna deschis |
| Panou lateral langa orice pagina web | `chrome.sidePanel` | Imposibil fara extensie |
| Sistem de permisiuni per origine pentru acces la chei | `chrome.permissions` + store personalizat | Fara echivalent standard |

**Blocajul critic pentru un site web care face NSP este Native Messaging.** `chrome.runtime.connectNative()` poate fi apelat doar din service worker-ele extensiei si din paginile extensiei - nu din nicio origine web, nici macar `localhost`. Nu exista solutie alternativa.

Fara Native Messaging, un site web care face scanare NSP are exact doua optiuni:

1. **Sa trimita cheia de scanare la un server.** Cheia privata de scanare este `nsec + tagged_hash(...)` - cine o detine poate monitoriza fiecare iesire Silent Payment adresata tie, pentru totdeauna. A o da unui server transforma un protocol de plata care pastreaza confidentialitatea intr-un instrument de supraveghere.

2. **Sa scaneze in tab-ul browserului cu JavaScript.** Scanarea BIP-352 necesita multiplicare scalara secp256k1 pentru fiecare tranzactie din fiecare bloc de la inaltimea de nastere. La volumul tipic de retea (mii de tranzactii pe bloc, sute de blocuri de scanat), asta ar dura ore intr-un tab de browser - si s-ar opri in momentul in care tab-ul se inchide.

Modelul de extensie rezolva ambele probleme elegant:

- Service worker-ul din fundal deriveaza `scan_priv` in memorie din `nsec`-ul stocat in sesiune.
- Transmite cheia direct procesului local `host.py` printr-un pipe Unix (Chrome Native Messaging). Pipe-ul este privat pentru perechea de procese OS.
- `host.py` efectueaza computatia ECDH local, interogheaza doar datele de tweak per bloc (nu cheia) de la serverul de index si returneaza doar UTXO-urile care iti apartin.
- Cheia de scanare nu este scrisa nicaieri. Daca browserul se inchide in mijlocul scanarii, dispare.

Asta este posibil numai pentru ca extensia are `chrome.runtime.connectNative()`. Un site web, un PWA si o aplicatie web locala servita din `file://` sau `localhost` nu au aceasta capabilitate.

---

## De ce Nostru este o premiera

**Nicio extensie de browser nu a combinat vreodata o identitate sociala Nostr cu Bitcoin Silent Payments.**

Inovatia cheie este protocolul NSP (Nostr Silent Payments):

1. **O singura cheie, doua retele.** Cheia ta privata Nostr (`nsec`) este un scalar secp256k1 - aceeasi curba pe care o foloseste Bitcoin. Nostru deriveaza chei BIP-352 de scanare si cheltuire din ea folosind hash-uri etichetate cu separare de domeniu (`nostr-sp/scan`, `nostr-sp/spend`), astfel incat unica ta cheie de identitate devine cheia ta de receptie Bitcoin.

2. **Trimite oricarui utilizator Nostr, in mod privat.** Oricine iti cunoaste npub-ul poate calcula adresa ta Silent Payment (`sp1...`) fara a te intreba - si fara a crea o legatura intre doua plati on-chain. Un expeditor nu poate sti daca ai primit plata uitandu-se la blockchain. Nici altcineva care urmareste.

3. **Cheia de scanare nu paraseste niciodata dispozitivul tau.** Cheia privata de scanare este echivalenta cu radacina nsec-ului tau. Nostru gestioneaza asta via Chrome Native Messaging: service worker-ul din fundal deriveaza cheia in memorie si o transmite direct unui proces Python local (`host.py`) printr-un pipe Unix. Cheia nu este niciodata scrisa pe disc, niciodata inregistrata in log-uri, niciodata trimisa prin retea.

4. **Nu este necesar un nod blockchain.** Scanarea foloseste un server de index usor (configurabil de utilizator) care furnizeaza tweaks precomputate per tranzactie. Host-ul local verifica potrivirea criptografica si raporteaza numai UTXO-urile care iti apartin.

5. **Sweep complet fara semnatura terta.** Host-ul local construieste si semneaza tranzactia de sweep BIP-341 P2TR complet in Python folosind zero dependente externe. Extensia primeste tranzactia bruta si iti permite sa o transmiti sau sa o copiezi pentru trimitere manuala.

Combinatia - descoperire sociala via Nostr + plati primite silentioase + semnatura numai locala - nu a existat niciodata intr-o singura extensie de browser.

---

## Credite

Ideea de a mapa identitati Nostr la adrese Bitcoin Silent Payment a fost articulata de **Tim Bouma** (GitHub: trbouma, Nostr: @trbouma). Nota sa despre culpabilitatea receptorului si capcana donatorului in NSP (https://gist.github.com/trbouma/77648ebe1005b181b67d1c4b42c7f31d) este fundamentul intelectual al acestui proiect: a identificat atat puterea maparii (fiecare npub este deja un receptor Bitcoin) cat si tensiunea sa nerezolvata (consimtamant, culpabilitate, capcana). Nostru este o implementare a acelei idei cu o arhitectura de mesagerie nativa locala care rezolva problema expunerii cheii de scanare.

---

## Standarde propuse

- [NIP-352](docs/nip-352.md) — *Bitcoin Silent Payment Address* — un event Nostr replaceable (kind:10352) care publică o adresă BIP-352 Silent Payment descoperibilă prin identitatea socială, fără a lega criptografic adresa de plată de perechea de chei sociale. Permite rotația adresei și separarea identității de plată de identitatea Nostr.

---

## Arhitectura

```
Browser (Chrome MV3)
  sidepanel.html          <- Interfata React
      WalletScreen        <- Controale NWC + NSP
      ProfileView         <- afiseaza adresa sp1 derivata pentru orice npub
  background.ts           <- service worker
      Bridge NIP-07       <- semnatar web pentru dApp-uri
      Sondare notificari  <- DM-uri, zaps, mentiuni
      Handler SP          <- deriveaza chei in memorie, apeleaza host-ul nativ
         |
         | Chrome Native Messaging (stdin/stdout, prefix lungime LE 4 bytes)
         v
  host.py (proces local, fara acces la retea pentru chei)
      identify            <- verificare versiune si capabilitati
      scan                <- scanare ECDH BIP-352 peste tweaks de la serverul de index
      sweep               <- constructie tx BIP-341 P2TR + semnatura Schnorr
```

---

## Silent Payments - Cum se foloseste

### Pasul 1 - Instalarea host-ului nativ

Logica de scanare si semnare ruleaza ca script Python local. Nu are dependente externe (stdlib Python 3.9+ pur).

```bash
git clone https://github.com/i2dor/nostru
cd nostru/tools/nostru-sp
python3 install.py --extension-id=<ID_EXTENSIE_TA>
```

Gaseste ID-ul extensiei tale la `chrome://extensions` (activeaza modul Developer). Ecranul Portofel il afiseaza automat in asistentul de configurare.

Pentru a verifica instalarea:

```bash
python3 install.py --verify
```

Pentru dezinstalare:

```bash
python3 install.py --uninstall
```

### Pasul 2 - Deblocarea Nostru

Autentifica-te cu nsec-ul tau. Cheia privata traieste doar in stocarea de sesiune si este folosita pentru a deriva cheile de scanare si cheltuire la cerere.

### Pasul 3 - Scanarea pentru plati

Deschide ecranul Portofel, extinde "Silent Payments (NSP)", seteaza **Birthday height** si alege o metoda de scanare:

| Metoda | Camp | Buton |
|--------|------|-------|
| **Index SP** (implicit) | Server index SP + Inaltime varf optional | Scaneaza pentru plati |
| **Esplora** | Endpoint Esplora + Inaltime varf (max 20 blocuri) | Scaneaza via Esplora |
| **Frigate** | Server Frigate (`ssl://host:50002` sau `tcp://host:50001`) | Scaneaza via Frigate |

In toate modurile, host-ul local efectueaza ECDH impotriva cheii tale de scanare. Nicio informatie despre cheia privata nu paraseste dispozitivul. Vezi [Metode de scanare](#metode-de-scanare) pentru detalii.

### Pasul 4 - Sweep

Odata gasite UTXO-urile, introdu o adresa Bitcoin de destinatie si o rata de comision (sat/vB), apoi apasa **Construieste tranzactia de sweep**. Host-ul local:

1. Deriveaza scalarul de cheltuire per iesire (`b_spend + t_k mod n`)
2. Calculeaza sighash-ul BIP-341 pentru fiecare input
3. Semneaza cu BIP-340 Schnorr folosind o valoare aux aleatoare
4. Returneaza tranzactia serialzata bruta

Dupa aceea poti:
- **Copiaza TX bruta** - lipeste in orice instrument de transmitere Bitcoin
- **Transmite** - trimite direct la mempool.space/api/tx

---

## Primirea platilor NSP (impartasirea adresei tale)

Adresa ta Silent Payment este vizibila pe propria ta fisa de profil din extensie. Poti calcula si adresa sp1 a oricui altcuiva din npub-ul lor - apare automat in vizualizarea profilului sau.

Impartaseste-ti adresa sp1 la fel cum ai impartasi orice adresa Bitcoin. Expeditorii folosesc un portofel standard compatibil BIP-352; nu au nevoie sa stie nimic despre Nostr.

---

## Testare cu un cont burner

Cea mai sigura modalitate de a verifica intregul flux (derivare, primire, scanare, sweep) fara a risca fonduri reale sau a lega identitatea principala.

### Ce ai nevoie

- Nostru instalat si host-ul nativ configurat (vezi Pasul 1 de mai sus)
- Un portofel compatibil BIP-352 pentru trimitere (Cake Wallet pe mobil sau silentpayments.xyz/send)
- O mica cantitate de Bitcoin mainnet (1000-5000 sat; peste limita de dust)

Testnet nu este recomandat - indexul NSP de la silentpayments.xyz indexeaza numai mainnet.

### Pas cu pas

**1. Genereaza o pereche de chei Nostr burner**

```bash
npx nostr-tools@latest genkey
```

Noteaza inaltimea curenta a blocului - aceasta este birthday height-ul tau.

**2. Incarca perechea de chei in Nostru**

Deschide extensia, apasa "Adauga cont", lipeste nsec-ul. NU publica note din acest cont.

**3. Obtine adresa SP**

In ecranul Wallet sau pe propria fisa de profil, adresa `sp1...` apare automat.

**4. Trimite la adresa SP**

Dintr-un portofel compatibil BIP-352, trimite la adresa `sp1...`. Noteaza:
- ID-ul tranzactiei (txid)
- Inaltimea blocului in care a fost confirmata

**5. Scaneaza**

In ecranul Wallet, seteaza **Birthday height** la inaltimea blocului din pasul 1. Apasa **Scaneaza plati** (foloseste indexul SP implicit). Daca indexul nu este disponibil, incearca **Scaneaza via Esplora** sau **Scaneaza via Frigate** — vezi [Metode de scanare](#metode-de-scanare).

**6. Sweep**

Introdu o adresa de destinatie si o rata de comision, apoi apasa **Construieste tranzactie sweep**. Copiaza sau transmite tranzactia.

### Ce dovedeste un test reusit

| Verificare | Ce valideaza |
|-----------|-------------|
| Adresa sp1 derivata din npub burner | Matematica deriveScanPriv / deriveSpendPub corecta |
| Expeditorul foloseste portofel BIP-352 standard | Adresele sp1 Nostru sunt compatibile cu ecosistemul |
| Scanarea gaseste UTXO-ul | ECDH al host-ului nativ, interogarea serverului de index si derivarea cheilor functioneaza end-to-end |
| Sweep-ul se confirma | Semnatura BIP-341 P2TR si semnatura Schnorr sunt corecte |

---

## Metode de scanare

Sunt disponibile trei metode pentru detectarea Silent Payments primite. In toate cele trei, cheia privata de scanare ramane pe dispozitivul tau.

| Metoda | Protocol | Ideal pentru |
|--------|----------|-------------|
| **Index SP** | REST HTTP | Implicit; rapid; necesita un server de index BIP-352 |
| **Esplora** | REST HTTP | Fara index dedicat; preia blocuri brute local; max 20 blocuri per scanare |
| **Frigate** | TCP / TLS (Electrum JSON-RPC) | Istoric complet; intervale mari; necesita un server Frigate |

### Index SP

Implicit: `https://silentpayments.xyz/api`. Serverul returneaza date tweak precomputed per bloc; host-ul local face ECDH.

**Confidentialitate:** serverul de index vede IP-ul tau si intervalul de scanare (de la birthday la varf), dar nu cheia ta de scanare si nici UTXO-urile tale.

### Esplora

Preia tranzactii brute dintr-un API Esplora public sau self-hosted (`https://mempool.space` implicit) si calculeaza tweaks local. Nu necesita server de index SP dedicat. Limitat la 20 de blocuri per scanare.

### Frigate

[Frigate](https://github.com/sparrowwallet/frigate) este un server Electrum cu suport BIP-352. Transmite chei tweak `input_hash × A_sum` prin Electrum JSON-RPC; host-ul local efectueaza ECDH si potrivirea iesirilor P2TR. Cheia ta de scanare nu este trimisa niciodata la server.

**Format conexiune:**
- TLS: `ssl://host:50002`
- TCP simplu: `tcp://host:50001`

Pentru a rula propriul server Frigate, vezi [github.com/sparrowwallet/frigate](https://github.com/sparrowwallet/frigate).

---

## Configurarea relay-urilor

Relay-urile implicite sunt listate in `src/core/ndk/config.ts`. Poti adauga sau elimina relay-uri din Setari. Modificarile intra in vigoare imediat.

---

## Permisiuni

| Permisiune | De ce |
|------------|-------|
| `storage` | Salvarea conturilor, relay-urilor, blocurilor, ignorarilor, URI NWC |
| `sidePanel` | Deschiderea ca bara laterala sau tab nou |
| `nativeMessaging` | Conectarea la host-ul local `nostru.sp` pentru scanare/sweep Silent Payment |
| `notifications` | Notificari de sistem pentru mentiuni, zaps si DM-uri |
| `alarms` | Sondare in fundal la fiecare 5 minute |
| `windows` | Deschiderea popup-ului de aprobare NIP-07 |
| `host_permissions: https://*/*` | Rezolvare LNURL, NWC, obtinere facturi Lightning |

---

## Compilare din sursa

```bash
npm install
npm run build        # build de productie -> dist/chrome-mv3/
npm run dev          # mod dev cu HMR
npm test             # teste unitare vitest
```

Incarca `dist/chrome-mv3/` ca extensie neimpachetata in Chrome.

---

## Note de securitate

- **nsec nu paraseste niciodata browserul.** Cheia privata bruta este stocata in `chrome.storage.session` (numai memorie, stearsa la inchiderea browserului) si accesata numai de service worker-ul din fundal.
- **scan_priv si spend_priv sunt derivate la cerere** si transmise numai host-ului nativ via stdin. Nu sunt niciodata scrise pe disc, niciodata inregistrate in log-uri, niciodata incluse in nicio cerere de retea.
- **Host-ul nativ este sandboxat.** Chrome Native Messaging limiteaza host-ul sa comunice numai cu extensii care listeaza numele sau in `allowed_origins`. Calea binarului host si ID-ul extensiei permise sunt setate la momentul instalarii.
- **Nu exista secrete in acest depozitar.** Documentele de configurare folosesc substituenti; testele folosesc chei de test generate.
- **Necorelabilitatea iesirilor BIP-352** inseamna ca, chiar daca serverul de index este compromis, acesta afla numai ca cineva a scanat un interval de blocuri - nu ce iesiri iti apartin, deoarece pasul ECDH se produce local.

---

## Cum sa nu te doxezi

Silent Payments sparg analiza on-chain: doua plati catre acelasi npub produc iesiri fara legatura pe blockchain. Dar corespondenta dintre npub-ul tau si adresa ta SP este publica, determinista si permanenta - nu pe blockchain, ci la nivelul identitatii. Daca npub-ul tau este identitatea ta sociala publica, orice expeditor care iti consulta profilul stie deja ca te plateste *pe tine*.

Acestea sunt riscurile practice si ce poti face in fiecare caz:

| Risc | Ce se scurge | Masura |
|------|-------------|--------|
| **npub-ul este identitatea ta de plata** | Adresa ta SP poate fi calculata de oricine din npub-ul tau. Un nume real, domeniu NIP-05 sau poza in profilul tau kind:0 leaga adresa ta de primire Bitcoin de acea identitate in mod permanent. | Publica doar ceea ce esti dispus sa ai legat de adresa ta SP pentru totdeauna. |
| **Expunerea IP la relay-uri** | Fiecare relay inregistreaza IP-ul tau impreuna cu npub-ul tau. Mai multi operatori pot corela sesiunile tale. | Directioneaza traficul de relay prin Tor sau un VPN. |
| **Serverul de index SP** | Serverul de index (implicit: silentpayments.xyz) vede IP-ul tau si intervalul de scanare (blocul de nastere pana la varf). Nu vede cheia ta privata nici ce UTXOs iti apartin. | Gazdeste propriul index sau directioneaza cererile prin Tor. Seteaza un URL de server personalizat in ecranul Wallet. |
| **Difuzarea tranzactiilor** | Difuzarea integrata trimite tranzactia bruta catre mempool.space - acel endpoint vede IP-ul tau si tranzactia. | Foloseste propriul nod Bitcoin sau copiaza TX-ul brut si trimite-l prin Tor cu un instrument separat. |
| **NWC URI** | URI-ul tau `nostrwalletconnect://` este o acreditare de tip bearer. Cine o obtine poate goli portofelul pana la limita de cheltuieli configurata. | Nu o publica niciodata, nu face screenshot si nu o lipi intr-un document partajat. Trateaz-o cu aceeasi atentie ca nsec-ul tau. |
| **Metadatele kind:0 sunt permanente** | Numele, imaginea, NIP-05 si bio-ul sunt publicate pe relay-uri si legate permanent de npub-ul tau - si prin urmare de adresa ta SP. | Revizuieste profilul inainte de a-ti impartasi adresa sp1 public. |

**Separarea identitatilor**

Pentru o confidentialitate mai mare, foloseste o pereche de chei dedicata platilor:

1. Genereaza o a doua pereche de chei (`nsec2`) pe care nu o legi niciodata de un profil public si nu o folosesti pentru note sociale.
2. Deriveaza adresa ei SP si impartaseste doar aceea cu expeditori specifici.
3. Foloseste Nostru cu `nsec2` exclusiv pentru scanare si sweep.

Adresa SP derivata din `nsec2` este complet separata de npub-ul tau social. Expeditorii au nevoie de npub-ul de plata sau de adresa sp1 direct - nu o pot gasi din profilul tau public.

**Ce nu poti anula**

Corespondenta npub-la-adresa-SP este determinista si permanenta. Daca ti-ai publicat deja npub-ul pe scara larga, orice expeditor poate deja calcula adresa ta SP si va putea face asta permanent. Nu exista niciun mecanism de rotatie in afara rotatiei npub-ului insusi.

---

## Contact

Nostr: [npub17ph4attxued865ehp9j6dtfhpzj9az55wvur8dzq6t4y633qveuqvn9wf7](https://njump.me/npub17ph4attxued865ehp9j6dtfhpzj9az55wvur8dzq6t4y633qveuqvn9wf7)
