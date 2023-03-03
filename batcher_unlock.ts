import {
  Address,
  applyParamsToScript,
  Assets,
  Data,
  Datum,
  fromText,
  fromUnit,
  Lovelace,
  Lucid,
  sha256,
  Blockfrost, 
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
  toHex,
  fromHex,
  Unit,
  UTxO,
} from "./deps.ts";

import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";


const lucid = await Lucid.new(
  new Blockfrost(
    "https://cardano-preprod.blockfrost.io/api/v0",
    "preprodvm2DiKlh4apcEUi2imKSPakELefRjNJp",
  ),
  "Preprod",
);

lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./key.sk"));
console.log("You will sign and spend from", await lucid.wallet.address());
 
const validator = await readValidator();
console.log("You are about to spend from", lucid.utils.validatorToAddress(validator)); 
 
const tx_hash = await Deno.readTextFile("./batcher_lock.txt");
const utxo = { txHash: tx_hash, outputIndex: 0 };
 
// Cancel redeemer
  // const redeemer = Data.to(
  //   new Constr(0, 
  //     [
  //       new Constr(0, [ 
  //         2n
  //       ]),
  //     ]));


  const valid_from = 1677491076000;
  const valid_to = 1677499076000;


// Deposit redeemer
  const redeemer = Data.to(
    new Constr(0, 
      [
        new Constr(1, [ 
          new Constr(0, [ 
          "44fddf226a3f69e55467f685f4dd7875b1817790946c59be2ed012ee01c6b1d9",
          BigInt(valid_from)
        ]),
      ]),
      ]));

// const valid_from = new Date().getTime();
// const valid_to = new Date(valid_from + 2 * 60 * 60 * 1000); // add two hours (TTL: time to live)

// Deposit Datum (Detailer)
const detailerDatum = Data.to(
  new Constr(0, 
    [
     "44fddf226a3f69e55467f685f4dd7875b1817790946c59be2ed012ee01c6b1d9",
     BigInt(valid_from)
    ]));

console.log("Validity from", valid_from);

console.log("Datum", detailerDatum);

const txUnlock = await unlock(utxo, { from: validator, using: redeemer }, valid_from, valid_to, detailerDatum);
 
await lucid.awaitTx(txUnlock);
 
console.log(`1 ADA recovered from the contract
    Tx ID: ${txUnlock}
    Redeemer: ${redeemer}
`);

// --- Supporting functions

async function unlock(ref, { from, using }, valid_from, valid_to, detailerDatum): Promise<TxHash> {
  const [utxo] = await lucid.utxosByOutRef([ref]);

  const policyId = "0fe20365f66016154df350e2f13ae2412d2cd08554b48b18668e9228"
  const token_name = "44fddf226a3f69e55467f685f4dd7875b1817790946c59be2ed012ee01c6b1d9"

  const detailsAddress = "addr_test1wz7pylgn373nt9eu8em8lwk3ap9atuwzdre8tw34v9fr8ysjqzhkd"
 
  const tx = await lucid
    .newTx()
    .collectFrom([utxo], using)
    // .addSigner(await lucid.wallet.address()) // this should be beneficiary address (CANCEL)
    .attachSpendingValidator(from)
    .payToContract(detailsAddress, { inline: detailerDatum }, {lovelace: 2000000}) // Details address 
    .payToAddress("addr_test1vpf7f72jcswdxle4398dl9zzky9tgfj2wwvjhnq4awglurgyvcmlp", {
      lovelace: 2000000, [toUnit(policyId, token_name)]: 1n,}) // Lender
    .validFrom(valid_from)
    .validTo(valid_to)
    .complete();

  console.log("Off-chain validation passed, will sign the transaction");

  const signedTx = await tx
    .sign()
    .complete();
 
  // return signedTx.submit();
}

async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("./plutus.json")).validators.find((v) => v.title === "aada_finance.order_contract");
  return {
    type: "PlutusV2",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}