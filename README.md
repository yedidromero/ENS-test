# Animetlik – Mobile App (React Native + Reown AppKit)

Animetlik is a mobile Web3 app built with **Expo/React Native**.  
It demonstrates:

- Wallet connection via **Reown AppKit**
- On‑chain actions on **Monad Testnet**
- ENS subdomain integration for author identity  
  → e.g. `handle.animetlik.eth`

## Features
- Connect wallet (QR / Mobile)
- Subscribe to plans (on‑chain)
- Like publications with automatic reward split
- Generate ENS subdomains through an Ethereum registrar
- Link ENS identity to author profile on Monad

## Tech Stack
- React Native (Expo)
- Reown AppKit
- viem + wagmi
- Monad Testnet
- Ethereum ENS

## Setup
```bash
npm install --legacy-peer-deps
npx expo start
```
Open with **Expo Go** on your phone and connect your wallet.

## Contracts
**Monad Testnet**  
Stories: `0x6c1aE56758aa8031f0E3Db6107Be79BEa07E9f3F`  
Vault: `0x3fFeD014511b586E9E949f0826C665B609Ba658c`

**Ethereum ENS Registrar**  
Creates: `handle.animetlik.eth`  
(Add your deployed address here)

## Quick Demo Flow
1. Open Profile → Subscribe → Sign with wallet  
2. Open Read → Like → Sign  
3. ENS subdomain is created and linked to the user

## Repository
Smart contracts and deployment info:  
https://github.com/yedidromero/animetlik/tree/main/SMARTCONTRACT
