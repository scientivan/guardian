// Compiles contracts/Anchor.sol and deploys it to the FISCO BCOS node (web3 RPC).
// Usage: npx tsx scripts/deploy-anchor.ts   (prints values to copy into .env)
import { readFileSync } from "node:fs";
import { ContractFactory, JsonRpcProvider, Wallet } from "ethers";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const solc = require("solc");

async function main() {
  const rpc = process.env.FISCO_BCOS_RPC_URL ?? "http://127.0.0.1:8545";
  const key = process.env.FISCO_BCOS_PRIVATE_KEY;
  const wallet = key && key.startsWith("0x") ? new Wallet(key) : Wallet.createRandom();

  const input = {
    language: "Solidity",
    sources: { "Anchor.sol": { content: readFileSync("contracts/Anchor.sol", "utf8") } },
    settings: { evmVersion: "paris", outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (out.errors ?? []).filter((e: { severity: string }) => e.severity === "error");
  if (errors.length) throw new Error(JSON.stringify(errors));
  const c = out.contracts["Anchor.sol"].Anchor;

  const signer = wallet.connect(new JsonRpcProvider(rpc));
  const factory = new ContractFactory(c.abi, c.evm.bytecode.object, signer);
  const contract = await factory.deploy({ gasPrice: 0, type: 0 });
  await contract.waitForDeployment();

  console.log(`FISCO_BCOS_PRIVATE_KEY=${wallet.privateKey}`);
  console.log(`FISCO_BCOS_CONTRACT_ADDRESS=${await contract.getAddress()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
