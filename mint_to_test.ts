import {
  Blockfrost,
  // Constr,
  Data as Datas,
  Lucid,
  // fromText,
  // SpendingValidator,
  // TxHash,
  // toUnit,\
  BigInt,
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

const validator = await readValidator();

// --- Supporting functions
async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("./plutus.json")).validators.find((v) => v.title === "test_minter");
  return {
    type: "PlutusV2",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}

console.log("Validator address is", )

const txLock = await mint_tokens(validator);


console.log(`Minted the tokens
    Tx ID: ${txLock}
`);

// --- Supporting functions

async function mint_tokens(validator): Promise<TxHash>{
  // const contractAddress = lucid.utils.validatorToAddress(into);

  const policyId: PolicyId = lucid.utils.mintingPolicyToId(
    validator
  );


  console.log("Policy is", policyId);

  const intiger = 1676419076000
  const redeemer = Data.to(
    new Constr(0,
    [1679394818000n]))

  console.log(redeemer)




  const tx = await lucid
    .newTx()
    .payToAddress("addr_test1wq0dlcejx5nkh5p63g93cnk6gzkafezwg76uxfwpmuv2esg43z25k", {
      lovelace: 5000000,})
    .mintAssets({
      [toUnit(policyId, "ff")]: 1n,
    }, redeemer)
    .attachMintingPolicy(validator)
    .validFrom(intiger)
    .complete();

  console.log(tx.toHex);

  const signedTx = await tx
    .sign()
    .complete();

  console.log(tx)
  // return signedTx.submit();
 
}



