import { Contract, JsonRpcProvider, Wallet } from "ethers";

// Writes a SHA-256 hash to the Anchor contract on the local FISCO BCOS chain.
// Returns null when anchoring is not configured, so the app still runs; the
// local hash chain keeps working either way.

const ABI = ["function anchor(bytes32 hash, string kind)", "function anchoredAt(bytes32) view returns (uint256)"];

function contract(): Contract | null {
  const { FISCO_BCOS_RPC_URL: rpc, FISCO_BCOS_PRIVATE_KEY: key, FISCO_BCOS_CONTRACT_ADDRESS: addr } = process.env;
  if (!rpc || !key?.startsWith("0x") || !addr?.startsWith("0x")) return null;
  return new Contract(addr, ABI, new Wallet(key, new JsonRpcProvider(rpc)));
}

export async function anchorHash(sha256Hex: string, kind: string): Promise<string | null> {
  const c = contract();
  if (!c) return null;
  const h = `0x${sha256Hex}`;
  if ((await c.anchoredAt(h)) > BigInt(0)) return "already-anchored";
  const tx = await c.anchor(h, kind, { gasPrice: 0, type: 0 });
  const r = await tx.wait();
  if (r?.status !== 1) throw new Error(`anchor tx failed: ${tx.hash}`);
  return tx.hash as string;
}
