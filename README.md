# Animetlik – Frontend (React Native + Reown AppKit) 🇲🇽

App móvil (Expo/React Native) que demuestra conexión de wallet con **Reown AppKit** y **acciones on-chain reales** en **Monad Testnet**: **suscripción** y **like** con reparto automático **50/35/15** (autor/plataforma/staking).

> **Smart Contracts (backend) y pruebas on-chain**:  
> 📄 https://github.com/yedidromero/animetlik/tree/main/SMARTCONTRACT

---

## 🧱 Stack

- **React Native (Expo)**
- **Reown AppKit** (`@reown/appkit-wagmi-react-native`) para conexión y firmas
- **wagmi + viem** para lectura/escritura on-chain
- Red: **Monad Testnet** (`chainId = 10143`)

---

## ✅ Qué demuestra este frontend

1) **Conexión de wallet** con Reown (QR/deeplink).  
2) **Lecturas on-chain**: precio del plan y precio del like desde el contrato.  
3) **Escrituras on-chain** (firmadas):  
   - `subscribe(1,1)` (Premium) con `value = priceWei`.  
   - `like(pubId)` con `value = likePriceWei` + **breakdown** (50/35/15) antes de firmar.  
4) **Link al explorer** de Monad Testnet para verificar el hash y los eventos.

---

## 📦 Requisitos

- **Node.js** y **npm**
- **Expo** (no hace falta instalar global; usamos `npx expo`)
- **Expo Go** en tu **móvil físico** (Android recomendado)
- **Wallet** en el móvil (Metamask, etc.) con algo de MON testnet
- Estar en la **misma red Wi-Fi** (PC ↔ móvil) para escanear el QR de Expo

> **Importante**: para firmar en el móvil, la conexión via Reown usa **QR**: la wallet del teléfono escanea y firma.

---

## ⚙️ Configuración rápida

Clona e instala dependencias:

## bash
npm install --legacy-peer-deps

Lanza el proyecto:

## bash

npx expo start

## En la consola verás:

› Using Expo Go
› Press a │ open Android
› Press w │ open web
› Press j │ open debugger
› Press r │ reload app
...
Opción A (recomendada): abre Expo Go en tu teléfono y escanea el QR.

Asegúrate de que el teléfono y tu PC están en la misma red.

Conectar la wallet con Reown
En la app, toca Connect Wallet.

Elige All wallets y toca el ícono de cámara (escaneo QR).

Con tu wallet en el móvil, escanea el QR, acepta la sesión y firma cuando se te solicite.

Cada vez que envíes una transacción (suscripción o like), la firmas en el teléfono.

### 🔗 Direcciones y red
Chain: Monad Testnet (chainId = 10143)

Explorer: https://testnet.monadexplorer.com

### Contratos ya desplegados (demo):

Stories (principal): 0x6c1aE56758aa8031f0E3Db6107Be79BEa07E9f3F

Staking Vault: 0x3fFeD014511b586E9E949f0826C665B609Ba658c

Estas direcciones están referenciadas en los tabs Profile y Read.
Si cambias contratos/red, actualiza las constantes en los archivos.

### 🧭 Flujo para los jueces (en < 2 minutos)
1) Suscripción on-chain (tab Profile)
Abre Profile → pulsa plan: Premium.

La app lee el precio on-chain del plan (0.001 MON demo).

Pulsa Subscribe → Reown abre tu wallet → firma.

Al confirmar, la app muestra el hash y un botón “Ver en el explorer”.

### Ejemplo real de suscripción (click-to-verify):
https://testnet.monadexplorer.com/tx/0x02c2f61a35e88af5a4d8cf2913ca2a7f8fdc6c4785416e42fa6b391e18cab1d5

2) Like con split 50/35/15 (tab Read)
Abre Read → verás portada + título + texto.

Botón Like — 0.01 MON → se abre un modal de breakdown (autor 50%, plataforma 35%, staking 15%) con montos y direcciones.

Pulsa Confirmar → Reown abre tu wallet → firma.

Al confirmar, la app muestra hash y enlace al explorer.

Ejemplo real de like (click-to-verify):
https://testnet.monadexplorer.com/tx/0x59967b99b70f06356681da1d615ff08ed53edc32b52ee7aa68d03c655643087f

En los logs del explorer verás PublicationLiked (Stories) y RewardsFunded (Vault).

### 📁 Estructura (tabs relevantes)

app/
  (tabs)/
    profile.tsx   ← Suscripción: lee precio y llama subscribe(1,1)
    read.tsx      ← Lectura + Like: lee likePriceWei, breakdown y like(pubId)
    add.tsx       ← Editor demo (texto + portada) sin subir a IPFS en esta demo
read.tsx (Like con breakdown)
Lee likePriceWei() del contrato.

Calcula breakdown local (50/35/15) y lo muestra en un modal antes de firmar.

Simula con simulateContract, firma con walletClient.writeContract, espera con waitForTransactionReceipt.

Muestra hash + botón a explorer.

profile.tsx (Suscripción)
Lee plans(1) para priceWei y estado del plan.

Ejecuta subscribe(1,1) con value = priceWei.

Muestra hash + botón a explorer.

### 🛠️ Troubleshooting
“Red incorrecta”: cambia tu wallet a Monad Testnet (chainId 10143).

“Insufficient funds”: necesitas MON testnet en tu wallet.

No se abre la wallet: asegúrate de usar un dispositivo físico con Expo Go y estar en la misma red.

Transacción atascada: abre el hash en el explorer y revisa los logs/estado.

QR de AppKit no escanea: reinicia Expo Go y vuelve a Connect Wallet → All wallets → cámara.

### 🔒 Seguridad & buenas prácticas
Simulación previa (simulateContract) para construir exactamente la request que firma el wallet.

waitForTransactionReceipt asegura que la UI muestra confirmación real, no solo hash enviado.

Transparencia UX: breakdown antes de firmar (montos + direcciones).

URIs de contenido off-chain (IPFS/HTTP) → gas bajo y estado mínimo.

### 📚 Backend (Smart Contracts)
Detalles, direcciones, ABIs y todas las tx de referencia están documentadas aquí:
➡️ https://github.com/yedidromero/animetlik/tree/main/SMARTCONTRACT

### 🏁 Check-list para el track de Reown
 Usa Reown AppKit SDK en móvil (no es solo login).

 Lecturas on-chain de contrato.

 Escrituras on-chain reales (suscripción y like) firmadas.

 Enlaces al explorer para verificar recibos y eventos.

 Transparencia: breakdown del split antes de firmar.
