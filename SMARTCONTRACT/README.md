
# Animetlik – Smart Contract (Monad Testnet)

Plataforma Web3 para **publicar/leer historias** con **suscripciones on-chain** y **pago por like**. Cada pago se reparte automáticamente:

-   **50% Autor**
-   **35% Plataforma (tesorería)**
-   **15% Fondo de staking educativo**

---

## Red y Direcciones

| Red | Dirección | Enlace |
| :--- | :--- | :--- |
| **Red** | Monad Testnet (`chainId = 10143`) | - |
| **Explorer** | - | [https://testnet.monadexplorer.com](https://testnet.monadexplorer.com) |

### Contratos y Cuentas Clave

| Componente | Dirección | Enlace |
| :--- | :--- | :--- |
| **Stories** (contrato principal) | `0x6c1aE56758aa8031f0E3Db6107Be79BEa07E9f3F` | [Explorer Stories](https://testnet.monadexplorer.com/address/0x6c1aE56758aa8031f0E3Db6107Be79BEa07E9f3F) |
| **Vault de Staking** (Nativo) | `0x3fFeD014511b586E9E949f0826C665B609Ba658c` | [Explorer Vault](https://testnet.monadexplorer.com/address/0x3fFeD014511b586E9E949f0826C665B609Ba658c) |
| **Tesorería** (Plataforma) | `0x8F196252E39b632d6dd63f0BBCBb3E4E4D079104` | [Explorer Tesorería](https://testnet.monadexplorer.com/address/0x8F196252E39b632d6dd63f0BBCBb3E4E4D079104) |
| Autor (demo) | `0x369DB4c69319E1ca009FdfeA6d172A88210dbf05` | [Explorer Autor](https://testnet.monadexplorer.com/address/0x369DB4c69319E1ca009FdfeA6d172A88210dbf05) |
| Lector (demo) | `0xE3089CE4C381Ee9D137D5D2c634778b52ce1CC9C` | [Explorer Lector](https://testnet.monadexplorer.com/address/0xE3089CE4C381Ee9D137D5D2c634778b52ce1CC9C) |

> **Split activo**: 50/35/15 (plataforma **35%** + staking **15%**). Se configuró con `setFeeTargets`.

---

## Transacciones de Referencia (click-to-verify)

| Acción | Hash de la Transacción |
| :--- | :--- |
| Despliegue Stories | [0xc32b33a2b5d066901be7892c6a243d543964b2fa600eb12f86bfc6c8a000d291](https://testnet.monadexplorer.com/tx/0xc32b33a2b5d066901be7892c6a243d543964b2fa600eb12f86bfc6c8a000d291) |
| Autoriza a Stories como “funder” en el Vault (`setAuthorizedFunder`) | [0x5ecfe44333c40cef5e83fa1ef0868be1370fdbd65118337ed75402a36c8efec3](https://testnet.monadexplorer.com/tx/0x5ecfe44333c40cef5e83fa1ef0868be1370fdbd65118337ed75402a36c8efec3) |
| Plan creado Basico (`planId=1`, `0.001 MON/30d`) | [0xb59953867c34f4c391eb1b7bc3d2b0fa9c70934dc8d9c19943f0ffd0e7174186](https://testnet.monadexplorer.com/tx/0xb59953867c34f4c391eb1b7bc3d2b0fa9c70934dc8d9c19943f0ffd0e7174186) |
| Perfil de autor actualizado (`upsertMyProfile`) | [0x8e70f33dec95a5b40954b093a2ac0ce139baa7e8c0eac24457d0616b4f872280](https://testnet.monadexplorer.com/tx/0x8e70f33dec95a5b40954b093a2ac0ce139baa7e8c0eac24457d0616b4f872280) |
| Publicación creada (`pubId = 0`) | [0x81e0c5cc0a6d5ed4fb14f47b68806a02a210052ac64f72d61435bfc845ef06e1](https://testnet.monadexplorer.com/tx/0x81e0c5cc0a6d5ed4fb14f47b68806a02a210052ac64f72d61435bfc845ef06e1) |
| Suscripción (Premium) – lector paga `0.001 MON` | [0x02c2f61a35e88af5a4d8cf2913ca2a7f8fdc6c4785416e42fa6b391e18cab1d5](https://testnet.monadexplorer.com/tx/0x02c2f61a35e88af5a4d8cf2913ca2a7f8fdc6c4785416e42fa6b391e18cab1d5) |
| Like a `pubId=0` – lector paga `0.01 MON` + split + funding al Vault | [0x59967b99b70f06356681da1d615ff08ed53edc32b52ee7aa68d03c655643087f](https://testnet.monadexplorer.com/tx/0x59967b99b70f06356681da1d615ff08ed53edc32b52ee7aa68d03c655643087f) |
| Actualización de split `setFeeTargets` (35% plataforma / 15% staking) | [0x92554247155cb7f283f0bc24bce366edff2f3bb3477fc6a8f45a38519bd67b1e](https://testnet.monadexplorer.com/tx/0x92554247155cb7f283f0bc24bce366edff2f3bb3477fc6a8f45a38519bd67b1e) |

> **Nota sobre el Like (TX de ref):** En los **Logs** de la transacción del Like, verás los eventos `PublicationLiked(pubId, liker, author, amount, authorAmt, platformAmt, stakingAmt)` en el contrato **Stories**, y `RewardsFunded(storiesAddr, stakingAmt)` en el **Vault**. Esto demuestra el flujo completo.

---

## Contratos y Funciones

### 1) StoriesAndLikesNativeSplitStaking (Contrato Principal)

**Dirección:** `0x6c1a...f3F`

| Función | Descripción |
| :--- | :--- |
| `upsertMyProfile(string displayName, string avatarURI)` | Crea o actualiza el perfil del usuario que llama. |
| `createPlan(string name, uint256 priceWei, uint32 periodSecs, bool active)` | **Solo Owner**. Define planes de suscripción. Ej.: Básico → `0.001 MON / 30 días`. |
| `updatePlan(uint256 planId, string name, uint256 priceWei, uint32 periodSecs, bool active)` | **Solo Owner**. Modifica un plan existente. |
| `subscribe(uint256 planId, uint256 periods) payable` | Cobra `priceWei * periods`. Emite `Subscribed(...)`. |
| `createPublication(string title, string imageURI, string storyURI)` | Crea publicación (requiere plan activo). Guarda URIs off-chain (IPFS/HTTP). |
| `like(uint256 pubId) payable` | Cobra `likePriceWei` y reparte: Autor **50%**, Plataforma **35%**, Staking **15%**. Emite `PublicationLiked(...)` y hace `fund()` en el Vault. |
| `setFeeTargets(address _treasury, uint16 _platformBps, address _stakingVault, uint16 _stakingBps)` | **Solo Owner**. Configura los destinos y porcentajes en **Basis Points** (`10000 = 100%`). |

**Estado de Fees:** plataforma `3500 bps` (35%), staking `1500 bps` (15%), resto autor (50%).

#### Lecturas Útiles (View Functions)

-   `plans(planId)` → `(name, priceWei, periodSecs, active)`
-   `hasActivePlan(address user)` → `bool`
-   `likePriceWei()` → `uint256`
-   `getUserPublicationIds(address)` → `uint256[]`

---

### 2) StakingVaultNative (Vault de Recompensas Educativas)

**Dirección:** `0x3fFe...58c`

| Función | Descripción |
| :--- | :--- |
| `setAuthorizedFunder(address stories)` | **Solo Owner del Vault**. Permite que el contrato `Stories` deposite recompensas. |
| `fund() payable` | Función que recibe el 15% del pago del like. Emite `RewardsFunded(stories, amount)`. |

**Propiedad:**
-   El **Owner del Vault** es la cuenta que lo desplegó (`0x7DF9...Ff9d5`).
-   El **Owner de Stories** es la cuenta que lo desplegó (`0x8F19...79104`) y puede llamar a funciones de administración (`setFeeTargets`, `createPlan`, etc.).

---

## Cómo Demostramos Integración con Wallet (Reown)

En la aplicación móvil (React Native + Reown AppKit + wagmi/viem), se implementaron:

1.  **Lectura On-Chain de Precios:**
    -   `readContract({ functionName: 'plans', args: [1] })` → Muestra `priceWei` de Premium.
    -   `readContract({ functionName: 'likePriceWei' })` → Muestra precio del Like.
2.  **Transacciones Firmadas:**
    -   **Suscripción:** `subscribe(1,1)` con `value = priceWei`. El flujo incluye `simulateContract`, firma con `walletClient.writeContract` y espera con `waitForTransactionReceipt`.
    -   **Like:** `like(pubId)` con `value = likePriceWei`. Antes de firmar, se muestra el breakdown (50/35/15) con montos y direcciones.
3.  **Verificación Pública:**
    -   Se muestra el hash y un botón "Ver en el explorer" (links arriba). Los logs confirman los eventos **`Subscribed`**, **`PublicationLiked`**, y **`RewardsFunded`**.

---

## Cómo Reproducir (Tester/Juez)

**Precondiciones:** Tener **MON** en **Monad Testnet** y una wallet conectada con Reown/AppKit.

1.  **Perfil:** Ejecutar `upsertMyProfile("Autor demo", "ipfs://...")` (o desde la UI en la app).
2.  **Plan:** Confirmar que `plans(1)` devuelve `priceWei = 1e15` (**0.001 MON**) y `active = true`.
    -   Ver tx de creación de plan: [0xb59953867c34f4c391eb1b7bc3d2b0fa9c70934dc8d9c19943f0ffd0e7174186](https://testnet.monadexplorer.com/tx/0xb59953867c34f4c391eb1b7bc3d2b0fa9c70934dc8d9c19943f0ffd0e7174186)
3.  **Suscripción:** Desde la app, tocar Premium → firma `subscribe(1,1)` con `value = 0.001 MON`.
    -   Ejemplo real: [0x02c2f61a35e88af5a4d8cf2913ca2a7f8fdc6c4785416e42fa6b391e18cab1d5](https://testnet.monadexplorer.com/tx/0x02c2f61a35e88af5a4d8cf2913ca2a7f8fdc6c4785416e42fa6b391e18cab1d5)
4.  **Publicación:** Confirmar que existe `pubId = 0`.
    -   Tx de creación: [0x81e0c5cc0a6d5ed4fb14f47b68806a02a210052ac64f72d61435bfc845ef06e1](https://testnet.monadexplorer.com/tx/0x81e0c5cc0a6d5ed4fb14f47b68806a02a210052ac64f72d61435bfc845ef06e1)
5.  **Like + Split:** Desde la app, tocar Like — **0.01 MON** → modal de breakdown (50/35/15) → Confirmar.
    -   Verificar en logs: [0x59967b99b70f06356681da1d615ff08ed53edc32b52ee7aa68d03c655643087f](https://testnet.monadexplorer.com/tx/0x59967b99b70f06356681da1d615ff08ed53edc32b52ee7aa68d03c655643087f)

---

## ABIs Mínimos (Para Cliente)

Estos son los **minimal ABIs** para que cualquier cliente (como **viem/wagmi**) pueda interactuar con los contratos.

### Stories – Lecturas (View)

Stories – Escrituras (Write/Payable)
JSON

[
  { "type":"function","stateMutability":"payable","name":"subscribe","inputs":[{"name":"planId","type":"uint256"},{"name":"periods","type":"uint256"}],"outputs":[] },
  { "type":"function","stateMutability":"payable","name":"like","inputs":[{"name":"pubId","type":"uint256"}],"outputs":[] }
]

Stories – Escrituras (Write/Payable)
JSON

[
  { "type":"function","stateMutability":"payable","name":"subscribe","inputs":[{"name":"planId","type":"uint256"},{"name":"periods","type":"uint256"}],"outputs":[] },
  { "type":"function","stateMutability":"payable","name":"like","inputs":[{"name":"pubId","type":"uint256"}],"outputs":[] }
]
Vault – Admin/Operación
JSON

[
  { "type":"function","stateMutability":"nonpayable","name":"setAuthorizedFunder","inputs":[{"name":"stories","type":"address"}],"outputs":[] },
  { "type":"function","stateMutability":"payable","name":"fund","inputs":[],"outputs":[] }
]
Seguridad y Diseño
Pull-over-push: Los pagos se reparten en el momento del like, evitando la acumulación de saldos internos riesgosos.

URIs Off-Chain (IPFS/HTTP): Minimiza el coste de gas y el tamaño del estado on-chain.

BPS Configurables: Las comisiones (setFeeTargets) son configurables solo por el owner, siendo flexibles y auditable en cadena.

Vault Separado: El contrato principal (Stories) no custodia el fondo educativo, sino que solo lo alimenta a través de la función fund() en el Vault separado.

Contacto
Red: Monad Testnet (chainId=10143)
Contrato Principal (Stories): 0x6c1aE56758aa8031f0E3Db6107Be79BEa07E9f3F
Vault de Staking: 0x3fFeD014511b586E9E949f0826C665B609Ba658c

Para ver el flujo completo desde la app móvil (Reown): conectar wallet → suscribir → like → abrir hash en explorer. Los enlaces de ejemplo están disponibles en la tabla de Transacciones de Referencia.


---

**Instrucciones para arreglarlo en GitHub:**

1.  Abre tu archivo `README.md` en GitHub para editarlo.
2.  Busca la sección que comienza con `## ABIs Mínimos (Para Cliente)`.
3.  **Elimina** esa sección y todo el texto hasta el final.
4.  **Pega** el código Markdown completo que acabo de proporcionar (desde `## ABIs Mínimos...` hasta el final).
5.  Guarda los cambios.

¡Con esa corrección, los bloques de código JSON deberían aparecer perfectamente resaltados y formatead
