# Animetlik – Smart Contracts (Monad + ENS Integration)

##How are you using this Protocol / API?

We use ENS to generate a unique subdomain for every author (e.g., handle.animetlik.eth).
When a user registers in our platform, the ENS registrar contract deployed on Ethereum creates the subdomain and sets the corresponding records (addr, monad-address, channel-uri).
Our main Monad smart contract stores this ENS identity using the function linkMyEns, allowing authors to have a portable, verifiable Web3 identity connected to their profile and content.

#Code reference (line / file):
For the ENS registrar (registerAuthorSubname):

Line 95
https://github.com/yedidromero/ENS-test/blob/main/SMARTCONTRACT/AuthorEnsRegistrar.sol#L95

For the linking function in Stories (linkMyEns):

Line 324
https://github.com/yedidromero/ENS-test/blob/main/SMARTCONTRACT/smart.sol#L324


This repository contains the smart contracts powering Animetlik, a Web3 storytelling platform with on-chain subscriptions, paid likes, staking rewards, and ENS-based author identity.

## 🚀 What Changed (Summary)

### ✔️ 1. Updated Main Contract (Stories)
- Added support for **ENS identity linking** (`linkMyEns`).
- Authors can connect their ENS subdomain (created on Ethereum) to their profile on Monad.
- Cleaned profile structure to include:
  - `ensName`
  - `ensNode`

### ✔️ 2. New Contract Added: ENS Registrar (Ethereum)
A separate Ethereum contract creates subdomains like:

```
handle.animetlik.eth
```

It:
- Generates ENS subnames for authors.
- Sets `addr`, `monad-address`, and `channel-uri` text records.
- Emits events for UI integration.

### ✔️ 3. Staking Vault + Reward Split Logic
The like flow splits payments:
- **50% Author**
- **35% Platform**
- **15% Staking Vault**

The Vault receives rewards through `fund()` and accounts for staking payouts.

---

## 📜 Main Contracts (Monad Testnet)

**Stories (Main Logic)**  
`0x6c1aE56758aa8031f0E3Db6107Be79BEa07E9f3F`

**Staking Vault**  
`0x3fFeD014511b586E9E949f0826C665B609Ba658c`

Explorer: https://testnet.monadexplorer.com

---

## 🌐 ENS Registrar (Ethereum)

Used to create subdomains such as:

```
handle.animetlik.eth
```

➡️ Add your deployed registrar address here.

---

## 🔧 Key Functions

### In Stories (Monad)
- `subscribe(planId, periods)` – on-chain subscription  
- `createPublication(...)` – publish content  
- `like(pubId)` – like + reward split  
- `linkMyEns(node, name)` – connect ENS to profile  

### In ENS Registrar (Ethereum)
- `registerAuthorSubname(label, ethAddress, monadAddress, channelUri)`  
Creates ENS subdomain and configures records.

---

## 📌 Demo Flow
1. User subscribes on-chain.  
2. User likes a publication (reward split executed).  
3. ENS subdomain is generated on Ethereum.  
4. ENS is linked to the user's profile on Monad.

---

## 📚 Full Smart Contract Source
Available here:  
https://github.com/yedidromero/animetlik/tree/main/SMARTCONTRACT
