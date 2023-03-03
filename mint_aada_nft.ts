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

function decimalToHex(d, padding) {
  var hex = Number(d).toString(16);
  padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

  while (hex.length < padding) {
      hex = "0" + hex;
  }

  return hex;
}

const lucid = await Lucid.new(
  new Blockfrost(
    "https://cardano-preprod.blockfrost.io/api/v0",
    "preprodvm2DiKlh4apcEUi2imKSPakELefRjNJp",
  ),
  "Preprod",
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

  const tx_hash = "6a019f9ae3e0a30a15f3fbeede3c858c6b4290a6ee915472bf0c84f8a257d6e6";
  const tx_id = 0;

  const tx_hash_in_bytes = fromHex(decimalToHex(tx_id)+tx_hash);

  const redeemer = Data.to(
    new Constr(0, 
      [
        new Constr(0, [
          new Constr(0, [
          new Constr(0, [tx_hash]), 
          BigInt(tx_id)
        ]),
      ]),
      ]
        ));

  // console.log(redeemer)

  // This transforms UTXO to sha and hex
  console.log(toHex(sha256(tx_hash_in_bytes)));


  console.log(await (lucid.wallet.getUtxos()))
  

  console.log("Will mint TN", toHex(sha256(tx_hash_in_bytes)));

  // const tx = await lucid
  // .newTx()
  // .mintAssets({
  //   [toUnit(policyId, "ad8c879ac6cb2e8d9bacc4f734a5dbe8fc6c0b2ccb8433895aa5130bed30b998")]: -1n,
  // }, redeemer)
  // .attachMintingPolicy(validator)
  // .complete();

  const tx = await lucid
    .newTx()
    .mintAssets({
      [toUnit(policyId, toHex(sha256(tx_hash_in_bytes)))]: 1n,
    }, redeemer)
    .attachMintingPolicy(validator)
    .complete();

  console.log(tx.toHex);

  const signedTx = await tx
    .sign()
    .complete();

  console.log(tx)
  console.log("minted",  toHex(sha256(tx_hash_in_bytes)));
  return signedTx.submit();
 
}