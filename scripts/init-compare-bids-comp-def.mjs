import * as anchor from "@coral-xyz/anchor";
import { AddressLookupTableProgram, PublicKey, SystemProgram } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import {
  getArciumProgram,
  getArciumProgramId,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getLookupTableAddress,
  getMXEAccAddress,
} from "@arcium-hq/client";

const programId = new PublicKey(
  process.env.SHADOWBID_PROGRAM_ID ?? "EkfGifLr2z1zyVsqBWekmRnzGcfy45KzdNpSZbFm4yuy"
);
const idl = JSON.parse(readFileSync("target/idl/shadowbid.json", "utf8"));

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = new anchor.Program(idl, provider);
const arciumProgram = getArciumProgram(provider);
const mxeAccount = getMXEAccAddress(programId);
const mxe = await arciumProgram.account.mxeAccount.fetch(mxeAccount);
const lutOffset = new anchor.BN(mxe.lutOffsetSlot);
const compDefOffset = Buffer.from(getCompDefAccOffset("compare_bids")).readUInt32LE();

const signature = await program.methods
  .initCompareBidsCompDef()
  .accounts({
    payer: provider.wallet.publicKey,
    mxeAccount,
    compDefAccount: getCompDefAccAddress(programId, compDefOffset),
    addressLookupTable: getLookupTableAddress(programId, lutOffset),
    lutProgram: AddressLookupTableProgram.programId,
    systemProgram: SystemProgram.programId,
    arciumProgram: getArciumProgramId(),
  })
  .rpc({ commitment: "confirmed" });

console.log(`Initialized compare_bids computation definition: ${signature}`);
console.log("Circuit source: https://shadowbid-beta.vercel.app/arcium/compare_bids.arcis");
