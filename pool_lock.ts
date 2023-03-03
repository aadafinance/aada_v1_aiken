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
    "https://cardano-preprod.blockfrost.io/api/v0",
    "preprodvm2DiKlh4apcEUi2imKSPakELefRjNJp",
  ),
  "Preprod",
);

lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./key.sk"));

console.log("Wallet address is", lucid.wallet.address())

const validator = await readValidator();

// --- Supporting functions
async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("./plutus.json")).validators.find((v) => v.title === "aada_finance.pool_contract");
  return {
    type: "PlutusV2",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}

console.log("Validator address is", lucid.utils.validatorToAddress(validator));

const txLock = await lock_tokens(2000000, validator);

await Deno.writeTextFile('./tx_pool_lock.txt', txLock);

console.log(`Locked. Tx ID: ${txLock}
`);

// --- Supporting functions

async function lock_tokens(lovelace, into): Promise<TxHash>{

const batcher_datum = Data.to(
  new Constr(0,
      [
        new Constr(0, [
            "",
            ""
        ]),
        2000000n,
        2000000n
      ]
  ));

  const contractAddress = lucid.utils.validatorToAddress(into);

  // console.log(await (lucid.wallet.getUtxos()))
  
  const tx = await lucid
    .newTx()
    .payToContract(contractAddress, { inline: batcher_datum }, { lovelace })
    .complete();

  console.log(tx.toHex);

  const signedTx = await tx
    .sign()
    .complete();

  console.log(tx)

  return signedTx.submit();
}