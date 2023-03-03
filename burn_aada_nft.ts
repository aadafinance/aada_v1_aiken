import {
  Blockfrost,
  // Constr,
  Data as Datas,
  Lucid,
  // fromText,
  // SpendingValidator,
  // TxHash,
  // toUnit,
  utf8ToHex,
  // PolicyId,
  // TxHash,
  fromHex,
  sha256,
  toHex
} from "https://deno.land/x/lucid@0.9.1/mod.ts";
import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";

import {
  Address,
  applyParamsToScript,
  Assets,
  Data,
  Datum,
  fromText,
  fromUnit,
  Lovelace,
  // Lucid,
  // Blockfrost, 
  MintingPolicy,
  OutRef,
  paymentCredentialOf,
  PolicyId,
  ScriptHash,
  SpendingValidator,
  toUnit,
  Tx,
  TxHash,
  Constr,
  Unit,
  UTxO,
} from "./deps.ts";


const lucid = await Lucid.new(
  new Blockfrost(
    "https://cardano-preview.blockfrost.io/api/v0",
    "previewSlPIeQdNxHTslpTgGLlkyylmL0r9kkXm",
  ),
  "Preview",
);

lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./key.sk"));

console.log("Wallet address is", lucid.wallet.address())
// console.log(await lucid.wallet.getUtxos());

const validator = await readValidator('aada_nft.aada_nft');

// --- Supporting functions
async function readValidator(validator_name): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("./plutus.json")).validators.find((v) => v.title === validator_name);
  return {
    type: "PlutusV2",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}

const txLock = await mint_tokens(validator);


async function mint_tokens(validator): Promise<TxHash>{


  const policyId: PolicyId = lucid.utils.mintingPolicyToId(
    validator
  );



  const redeemer = Data.to(
    new Constr(0, 
      [
        new Constr(1, [Deno.args[0]])
      ])); // Supposed token name

  // console.log(redeemer)

  // This transforms UTXO to sha and hex
  

  console.log(await (lucid.wallet.getUtxos()))

  const tx = await lucid
    .newTx()
    .mintAssets({
      [toUnit(policyId, Deno.args[0])]: -1n,}, redeemer)
    .attachMintingPolicy(validator)
    .complete();

  console.log(tx.toHex);

  const signedTx = await tx
    .sign()
    .complete();

  console.log(tx)
  console.log("burned",  Deno.args[0]);
  return signedTx.submit();
 
}



