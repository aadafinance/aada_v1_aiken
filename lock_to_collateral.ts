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

const validator = await readValidator();

// --- Supporting functions
async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("./plutus.json")).validators.find((v) => v.title === "collateral");
  return {
    type: "PlutusV2",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}

console.log("Validator address is", lucid.utils.validatorToAddress(validator));

const txLock = await lock_tokens(2000000, validator);

console.log(`Locked. Tx ID: ${txLock}
`);

// --- Supporting functions

async function lock_tokens(lovelace, into): Promise<TxHash>{

// const paymentKeyHash = lucid.utils
// .getAddressDetails(await Deno.readTextFile("./key.addr"))
// .paymentCredential
// .hash;

let paymentKeyHash = "72c0a5fdf0fcdd32555c357539a872d490646ecfa7189c8070a24e48"

const stakeKeyHash = ""
// const stakeKeyHash = lucid.utils
// .getAddressDetails(await Deno.readTextFile("./key.addr"))
// .stakeCredential
// .hash;
  
const collateral_datum = Data.to(
  new Constr(0,
      [
          "eebb21d5b9edd920f771cd75d048723da4f8d66e8ca96eacf14d40c785d21f47",
          // new Constr(0, [
          //     new Constr(0, [
          //       paymentKeyHash
          //     ]),
          //     new Constr(0, [
          //         new Constr(0, [
          //             new Constr(0, [
          //               stakeKeyHash
          //             ]),
          //         ]),
          //     ]),
          // ]),
          new Constr(0, [
            new Constr(0, [
              "72c0a5fdf0fcdd32555c357539a872d490646ecfa7189c8070a24e48"
            ]),
            new Constr(1, []),
          ]),
          new Constr(0, [ // Loan asset
          "",
          ""
          ]),
          2000000n,
          new Constr(0, [ // interest asset
              "",
              ""
          ]),
          1000000n,
          new Constr(0, [ // collateral asset
              "",
              ""
          ]),
          3000000n,
          34000n,
          "ff",
          1123n,
          1123n,
          1679394818000n,
          "013545dfac4cb666841336004d016aeeecdae2af3ca30e949ea701545b473225", // Lender NFT
          BigInt(123123) // Lend date
      ]
  ));

  const contractAddress = lucid.utils.validatorToAddress(into);

  // console.log(await (lucid.wallet.getUtxos()))
  
  const tx = await lucid
    .newTx()
    .payToContract(contractAddress, { inline: collateral_datum }, { lovelace })
    .complete();

  console.log(tx.toHex);

  const signedTx = await tx
    .sign()
    .complete();

  console.log(tx)

  return signedTx.submit();
}