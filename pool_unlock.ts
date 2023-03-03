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

const tx_hash = await Deno.readTextFile("./tx_pool_lock.txt");
const utxo = { txHash: tx_hash, outputIndex: 0 };


// Deposit redeemer
const redeemer = Data.to(
  new Constr(0, 
    [
      new Constr(1, [ 
          new Constr(0,
              [
                new Constr(0, [
                    "",
                    ""
                ]),
                2000000n
              ]
          )
    ]),
    ]));


const just_datum = Data.to(
  new Constr(0,
      [
        new Constr(0, [
            "",
            ""
        ]),
        4000000n,
        2000000n
      ]
  ));


const txUnlock = await unlock(utxo, { from: validator, using: redeemer });

await lucid.awaitTx(txUnlock);

console.log(`1 ADA recovered from the contract
  Tx ID: ${txUnlock}
  Redeemer: ${redeemer}
`);

// --- Supporting functions

async function unlock(ref, { from, using } ): Promise<TxHash> {
const [utxo] = await lucid.utxosByOutRef([ref]);

const contractAddress = lucid.utils.validatorToAddress(from);

const tx = await lucid
  .newTx()
  .collectFrom([utxo], using)
  .attachSpendingValidator(from)
  .payToContract(contractAddress, { inline: just_datum }, {lovelace: 4000000}) // Details address 
  .complete();

console.log("Off-chain validation passed, will sign the transaction");

const signedTx = await tx
  .sign()
  .complete();

return signedTx.submit();
}

async function readValidator(): Promise<SpendingValidator> {
const validator = JSON.parse(await Deno.readTextFile("./plutus.json")).validators.find((v) => v.title === "aada_finance.pool_contract");
return {
  type: "PlutusV2",
  script: toHex(cbor.encode(fromHex(validator.compiledCode))),
};
}