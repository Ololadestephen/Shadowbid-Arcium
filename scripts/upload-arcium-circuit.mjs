import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { uploadCircuit } from "@arcium-hq/client";

const circuitName = process.argv[2] ?? "compare_bids";
const programId = new PublicKey(
  process.env.SHADOWBID_PROGRAM_ID ?? "CSqdLojNG42tPTGTD5tGUv7X8o896Jqq98T1zkynErnW"
);
const circuitPath = resolve("build", `${circuitName}.arcis`);

if (!existsSync(circuitPath)) {
  throw new Error(
    `${circuitPath} is missing. Run arcium build in an Arcium-enabled environment and copy the generated .arcis artifact into build/ before uploading.`
  );
}

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const signature = await uploadCircuit(
  provider,
  circuitName,
  programId,
  readFileSync(circuitPath),
  true
);

console.log(`Uploaded ${circuitName}: ${signature}`);
