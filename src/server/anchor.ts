import { Contract, FetchRequest, JsonRpcProvider, Wallet } from "ethers";

// Writes a SHA-256 hash to the Anchor contract on the local FISCO BCOS chain.
// Returns null when anchoring is not configured, so the app still runs; the
// local hash chain keeps working either way.

const ABI = ["function anchor(bytes32 hash, string kind)", "function anchoredAt(bytes32) view returns (uint256)"];

function contract(): {contract:Contract;provider:JsonRpcProvider} | null {
  const { FISCO_BCOS_RPC_URL: rpc, FISCO_BCOS_PRIVATE_KEY: key, FISCO_BCOS_CONTRACT_ADDRESS: addr } = process.env;
  if (!rpc || !key?.startsWith("0x") || !addr?.startsWith("0x")) return null;
  const request=new FetchRequest(rpc);
  request.timeout=8000;
  const provider=new JsonRpcProvider(request,Number(process.env.FISCO_BCOS_CHAIN_ID??20200),{staticNetwork:true});
  return {contract:new Contract(addr, ABI, new Wallet(key,provider)),provider};
}

export async function anchorHash(sha256Hex: string, kind: string): Promise<string | null> {
  const connection = contract();
  if (!connection) return null;
  try {
    const c=connection.contract;
    const h = `0x${sha256Hex}`;
    if ((await c.anchoredAt(h)) > BigInt(0)) return "already-anchored";
    const tx = await c.anchor(h, kind, { gasPrice: 0, type: 0 });
    const r = await tx.wait(1,12000);
    if (r?.status !== 1) throw new Error(`anchor tx failed: ${tx.hash}`);
    return tx.hash as string;
  } finally {connection.provider.destroy();}
}
