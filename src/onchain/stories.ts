import { ethers } from "ethers";

export const MONAD_CHAIN_ID = 10143;
export const MONAD_EXPLORER_TX = "https://testnet.monadexplorer.com/tx/";
export const STORIES_ADDR = "0x6c1ae56758aa8031f0e3db6107be79bea07e9f3f";

const ABI = [
  "function plans(uint256) view returns (string name,uint256 priceWei,uint32 periodSecs,bool active)",
  "function subscribe(uint256 planId,uint256 periods) payable"
];

export function stories(signerOrProvider: ethers.Signer | ethers.AbstractProvider) {
  return new ethers.Contract(STORIES_ADDR, ABI, signerOrProvider);
}

export async function getPremiumPriceWei(provider: ethers.AbstractProvider) {
  const c = stories(provider);
  const p = await c.plans(1);
  return p.priceWei as bigint; // 0.001 MON en tu despliegue
}

export async function subscribePremium(signer: ethers.Signer) {
  const c = stories(signer);
  const p = await c.plans(1);
  if (!p.active) throw new Error("Plan Premium inactivo");
  const tx = await c.subscribe(1, 1, { value: p.priceWei });
  const rc = await tx.wait();
  return { hash: rc.hash as string, paidWei: p.priceWei as bigint };
}

export const fmtMON = (wei: bigint) => ethers.formatEther(wei) + " MON";
