# Nostru

Um cliente social Nostr construido como extensao de painel lateral do navegador (Chrome MV3). Permite ler e escrever na rede Nostr, enviar zaps com um clique via NWC e receber Bitcoin atraves de Silent Payments - tudo sem sair do navegador.

---

## O que faz

| Funcao | Descricao |
|--------|-----------|
| **Feed social** | Feed inicial via modelo outbox do Nostr (NDK), com respostas, reacoes, reposts e zaps |
| **Perfis** | Ver qualquer perfil Nostr, seguir/deixar de seguir, ver contagem de seguidores |
| **Pesquisa** | Pesquisa de texto completo em notas, perfis e artigos, com filtros de autor e data |
| **Mensagens diretas** | Mensagens cifradas NIP-04 e NIP-44 (kind 4 / 1059) |
| **Carteira NWC** | Zaps Lightning com um clique via Nostr Wallet Connect; visualizacao de saldo |
| **Listas de bloqueio/silencio** | Lista de silencio NIP-51 (kind 10000), publicada em relays; lista de bloqueio local |
| **Bridge NIP-07** | Atua como signatario Nostr estilo web3 para dApps; sistema de permissoes por site |
| **Enderecos NSP** | Deriva um endereco BIP-352 Silent Payment de qualquer chave publica Nostr - sem necessidade de consentimento do destinatario |
| **Varredura NSP** | Detecta Silent Payments Bitcoin recebidos via host nativo local (sem exposicao de chaves na nuvem) |
| **Sweep NSP** | Constroi e opcionalmente transmite uma transacao de sweep assinada completamente de forma local |
| **Notificacoes** | Sondagem em segundo plano para mencoes, zaps e DMs; notificacoes do sistema |

---

## O que NAO faz

| O que | Por que |
|-------|---------|
| Armazenar chaves privadas permanentemente | As chaves vivem apenas em `chrome.storage.session` (apagadas ao fechar o navegador) |
| Enviar sua chave de varredura a qualquer servidor | A chave privada de varredura e derivada em memoria na extensao e passada apenas ao processo nativo local via Chrome Native Messaging - nunca pela rede |
| Exigir conta para mostrar enderecos NSP | Qualquer npub e suficiente para calcular o endereco Silent Payment de alguem |
| Transmitir transacoes automaticamente | A transmissao e sempre uma acao explicita do usuario com um botao dedicado |
| Coletar telemetria | Zero analiticas, zero beacons, zero scripts de terceiros |
| Usar varredura na nuvem | A varredura roda localmente via `host.py` usando um servidor de indice configurado pelo usuario apenas para dados de bloco (tweaks), nunca para chaves privadas |
| Expor historico de transacoes | As saidas Silent Payment sao desvinculaveis on-chain; sem reutilizacao de xpub ou enderecos |

---

## Cada conta Nostr e um receptor de Bitcoin Silent Payment

As identidades Nostr sao pares de chaves secp256k1 - a mesma curva eliptica que o Bitcoin usa. BIP-352 (Silent Payments) tambem e construido sobre secp256k1. Isso significa que a derivacao nao e um truque ou solucao alternativa: e uma consequencia matematica direta da aritmetica de curva compartilhada.

A derivacao de qualquer chave publica Nostr (`npub`) para um endereco Silent Payment (`sp1...`) funciona assim:

| Passo | Operacao | Quem pode fazer isso |
|-------|----------|----------------------|
| 1 | Pegar a chave publica Nostr x-only (32 bytes, Y-par conforme BIP-340) | Qualquer pessoa |
| 2 | Calcular `ScanPub = P + tagged_hash("nostr-sp/scan", P_compressed) * G` | Qualquer pessoa |
| 3 | Calcular `SpendPub = P + tagged_hash("nostr-sp/spend", P_compressed) * G` | Qualquer pessoa |
| 4 | Codificar como `sp1... = bech32m([0x00] + ScanPub_33 + SpendPub_33)` | Qualquer pessoa |
| 5 | Detectar pagamentos recebidos (derivar `scan_priv`, varrer blocos via ECDH) | Apenas o titular do nsec |
| 6 | Gastar fundos recebidos (derivar `spend_priv + t_k`, assinar tx de sweep) | Apenas o titular do nsec |

A propriedade-chave: os passos 1-4 requerem apenas a chave publica e sao deterministicos. **Qualquer pessoa que possa encontrar seu npub pode pagar voce, sem nunca pedir um endereco, sem voce estar online e sem nenhum link on-chain entre dois pagamentos para voce.**

Isso significa que:

- **Cada usuario Nostr ja e um receptor de Bitcoin SP**, saiba ou nao. O endereco existe no momento em que o par de chaves existe.
- **O grafo social do Nostr funciona tambem como diretorio de pagamentos Bitcoin.** Se voce segue alguem, pode pagar silenciosamente apenas pelo perfil - sem que ela tenha compartilhado jamais um endereco Bitcoin.
- **Os pagamentos sobrevivem a rotacao de chaves.** Um remetente calcula o endereco uma vez a partir do npub e os UTXOs resultantes sao indistinguiveis de qualquer outra saida P2TR on-chain - sem reutilizacao de enderecos, sem agrupamento, sem vinculacao entre remetentes.
- **O destinatario nao precisa estar rodando o Nostru.** Qualquer carteira compativel com BIP-352 pode enviar para um endereco sp1 derivado de um npub. O destinatario pode varrer mais tarde com o Nostru quando quiser.

O Nostru torna isso visivel: abra qualquer perfil na extensao e o endereco `sp1...` aparece automaticamente, calculado ao vivo no seu navegador a partir de nada mais que a chave publica da conta.

---

## Por que uma extensao e nao um site

A varredura de Silent Payment requer acesso a uma chave privada de varredura equivalente a sua chave privada Nostr. Um site - mesmo servido via HTTPS ou de localhost - nao pode lidar com isso com seguranca. Uma extensao de navegador pode.

| Capacidade | Extensao | Site |
|------------|----------|------|
| Armazenamento de chaves em memoria inacessivel a scripts de pagina | `chrome.storage.session` | Sem equivalente; variaveis JS sao alcancaveis por qualquer script injetado |
| Comunicacao com um processo nativo local | `chrome.runtime.connectNative()` | Nao disponivel - esta API e exclusiva de extensoes |
| Injetar um signatario NIP-07 em cada pagina | Content scripts com acesso ao mundo `MAIN` | Exigiria uma extensao de navegador de qualquer forma |
| Executar tarefas em segundo plano sem aba visivel | Service worker + `chrome.alarms` | Requer servidor ou aba sempre aberta |
| Painel lateral ao lado de qualquer pagina | `chrome.sidePanel` | Impossivel sem extensao |
| Sistema de permissoes por origem para acesso a chaves | `chrome.permissions` + store personalizado | Sem equivalente padrao |

**O bloqueio critico para um site fazer NSP e o Native Messaging.** `chrome.runtime.connectNative()` so pode ser chamado de service workers de extensao e paginas de extensao - nao de nenhuma origem web, nem mesmo `localhost`. Nao ha solucao alternativa.

Sem Native Messaging, um site fazendo varredura NSP tem exatamente duas opcoes:

1. **Enviar a chave de varredura a um servidor.** A chave privada de varredura e `nsec + tagged_hash(...)` - quem a detiver pode monitorar cada saida Silent Payment enderecoada a voce, para sempre. Dar a um servidor converte um protocolo de pagamento que preserva a privacidade em uma ferramenta de vigilancia.

2. **Varrer na aba do navegador com JavaScript.** A varredura BIP-352 requer multiplicacao escalar secp256k1 para cada transacao em cada bloco desde a altura de nascimento. No volume tipico de rede (milhares de transacoes por bloco, centenas de blocos para varrer), isso levaria horas em uma aba do navegador - e pararia no momento em que a aba fosse fechada.

O modelo de extensao resolve ambos os problemas de forma limpa:

- O service worker em segundo plano deriva `scan_priv` em memoria a partir do `nsec` armazenado na sessao.
- Passa a chave diretamente ao processo local `host.py` via um pipe Unix (Chrome Native Messaging). O pipe e privado para o par de processos do SO.
- `host.py` realiza a computacao ECDH localmente, consulta apenas os dados de tweak por bloco (nao a chave) do servidor de indice e retorna apenas os UTXOs que pertencem a voce.
- A chave de varredura nunca e escrita em lugar nenhum. Se o navegador fechar no meio da varredura, ela desaparece.

Isso so e possivel porque a extensao tem `chrome.runtime.connectNative()`. Um site, um PWA e um app web local servido de `file://` ou `localhost` nao tem essa capacidade.

---

## Por que o Nostru e uma estreia absoluta

**Nenhuma extensao de navegador jamais combinou uma identidade social Nostr com Bitcoin Silent Payments.**

A inovacao-chave e o protocolo NSP (Nostr Silent Payments):

1. **Uma chave, duas redes.** Sua chave privada Nostr (`nsec`) e um escalar secp256k1 - a mesma curva que o Bitcoin usa. O Nostru deriva chaves BIP-352 de varredura e gasto a partir dela usando hashes rotulados com separacao de dominio (`nostr-sp/scan`, `nostr-sp/spend`), de modo que sua unica chave de identidade se torna sua chave de recebimento de Bitcoin.

2. **Pague qualquer usuario Nostr, de forma privada.** Qualquer pessoa que conheca seu npub pode calcular seu endereco Silent Payment (`sp1...`) sem te perguntar - e sem criar um link entre dois pagamentos on-chain. Um remetente nao pode saber se voce recebeu o pagamento olhando para o blockchain. Nem mais ninguem que observe.

3. **A chave de varredura nunca sai do seu dispositivo.** A chave privada de varredura e equivalente a raiz do seu nsec. O Nostru lida com isso via Chrome Native Messaging: o service worker em segundo plano deriva a chave em memoria e a passa diretamente a um processo Python local (`host.py`) por um pipe Unix. A chave nunca e gravada em disco, nunca e registrada em log, nunca e enviada pela rede.

4. **Nao e necessario um no blockchain.** A varredura usa um servidor de indice leve (configuravel pelo usuario) que fornece tweaks pre-computados por transacao. O host local verifica a correspondencia criptografica e relata apenas os UTXOs que pertencem a voce.

5. **Sweep completo sem assinatura de terceiros.** O host local constroi e assina a transacao de sweep BIP-341 P2TR completamente em Python usando zero dependencias externas. A extensao recebe a transacao bruta e permite que voce a transmita ou copie para envio manual.

A combinacao - descoberta social via Nostr + pagamentos recebidos silenciosos + assinatura apenas local - nunca existiu em uma unica extensao de navegador.

---

## Arquitetura

```
Navegador (Chrome MV3)
  sidepanel.html          <- Interface React
      WalletScreen        <- Controles NWC + NSP
      ProfileView         <- mostra endereco sp1 derivado para qualquer npub
  background.ts           <- service worker
      Bridge NIP-07       <- signatario web para dApps
      Sondagem notificacoes <- DMs, zaps, mencoes
      Handler SP          <- deriva chaves em memoria, chama o host nativo
         |
         | Chrome Native Messaging (stdin/stdout, prefixo comprimento LE 4 bytes)
         v
  host.py (processo local, sem acesso de rede a chaves)
      identify            <- verificacao de versao e capacidades
      scan                <- varredura ECDH BIP-352 sobre tweaks do servidor de indice
      sweep               <- construcao de tx BIP-341 P2TR + assinatura Schnorr
```

---

## Silent Payments - Como usar

### Passo 1 - Instalar o host nativo

A logica de varredura e assinatura roda como script Python local. Nao tem dependencias externas (stdlib Python 3.9+ puro).

```bash
git clone https://github.com/i2dor/nostru
cd nostru/tools/nostru-sp
python3 install.py --extension-id=<SEU_ID_DE_EXTENSAO>
```

Encontre seu ID de extensao em `chrome://extensions` (ative o modo desenvolvedor). A tela de Carteira o mostra automaticamente no assistente de configuracao.

Para verificar a instalacao:

```bash
python3 install.py --verify
```

Para desinstalar:

```bash
python3 install.py --uninstall
```

### Passo 2 - Desbloquear o Nostru

Faca login com seu nsec. A chave privada vive apenas no armazenamento de sessao e e usada para derivar as chaves de varredura e gasto sob demanda.

### Passo 3 - Varrer por pagamentos

Abra a tela de Carteira, expanda "Silent Payments (NSP)", e preencha:

| Campo | O que inserir |
|-------|---------------|
| Servidor de indice SP | URL de um indice BIP-352 (padrao: silentpayments.xyz/api) |
| Altura de nascimento | A altura de bloco a partir da qual comecar a varredura (use a altura quando voce primeiro compartilhou seu endereco sp1) |
| Altura ponta | Limite superior opcional; deixe em branco para o padrao do servidor |

Clique em **Varrer por pagamentos**. O host local consulta o servidor de indice para tweaks por bloco e realiza ECDH contra sua chave de varredura para encontrar saidas P2TR correspondentes. Nenhuma informacao de chave privada e enviada ao servidor de indice.

### Passo 4 - Sweep

Uma vez encontrados os UTXOs, insira um endereco Bitcoin de destino e uma taxa de comissao (sat/vB), depois clique em **Construir transacao de sweep**. O host local:

1. Deriva o escalar de gasto por saida (`b_spend + t_k mod n`)
2. Calcula o sighash BIP-341 para cada entrada
3. Assina com BIP-340 Schnorr usando um valor aux aleatorio
4. Retorna a transacao serializada bruta

Voce entao pode:
- **Copiar TX bruta** - colar em qualquer ferramenta de transmissao Bitcoin
- **Transmitir** - envia diretamente para mempool.space/api/tx

---

## Recebendo pagamentos NSP (compartilhando seu endereco)

Seu endereco Silent Payment e visivel no seu proprio cartao de perfil na extensao. Voce tambem pode calcular o endereco sp1 de qualquer outro usuario a partir do npub dele - aparece automaticamente na visualizacao do perfil.

Compartilhe seu endereco sp1 da mesma forma que compartilharia qualquer endereco Bitcoin. Os remetentes usam uma carteira padrao compativel com BIP-352; nao precisam saber nada sobre Nostr.

---

## Configuracao de relays

Os relays padrao estao listados em `src/core/ndk/config.ts`. Voce pode adicionar ou remover relays nas Configuracoes. As alteracoes entram em vigor imediatamente.

---

## Permissoes

| Permissao | Por que |
|-----------|---------|
| `storage` | Salvar contas, relays, bloqueios, silencios, URI NWC |
| `sidePanel` | Abrir como barra lateral do navegador |
| `nativeMessaging` | Conectar ao host local `nostru.sp` para varredura/sweep Silent Payment |
| `notifications` | Notificacoes do sistema para mencoes, zaps e DMs |
| `alarms` | Sondagem em segundo plano a cada 5 minutos |
| `windows` | Abrir popup de aprovacao NIP-07 |
| `host_permissions: https://*/*` | Resolucao LNURL, NWC, obtencao de faturas Lightning |

---

## Compilar a partir do codigo-fonte

```bash
npm install
npm run build        # build de producao -> dist/chrome-mv3/
npm run dev          # modo dev com HMR
npm test             # testes unitarios vitest
```

Carregue `dist/chrome-mv3/` como extensao desempacotada no Chrome.

---

## Notas de seguranca

- **O nsec nunca sai do navegador.** A chave privada bruta e armazenada em `chrome.storage.session` (apenas memoria, apagada ao fechar o navegador) e acessada apenas pelo service worker em segundo plano.
- **scan_priv e spend_priv sao derivados sob demanda** e passados apenas ao host nativo via stdin. Nunca sao gravados em disco, nunca registrados em log, nunca incluidos em nenhuma requisicao de rede.
- **O host nativo e sandboxed.** O Chrome Native Messaging limita o host a se comunicar apenas com extensoes que listam seu nome em `allowed_origins`. O caminho do binario do host e o ID de extensao permitido sao definidos no momento da instalacao.
- **Nao ha segredos neste repositorio.** Os documentos de configuracao usam marcadores de posicao; os testes usam chaves de teste geradas.
- **A desvinculabilidade de saidas BIP-352** significa que, mesmo que o servidor de indice seja comprometido, ele aprende apenas que alguem varreu um intervalo de blocos - nao quais saidas pertencem a voce, pois a etapa ECDH ocorre localmente.
