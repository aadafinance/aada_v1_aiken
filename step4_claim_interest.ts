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

await lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./key.sk"));

const validator = await readValidator("interest.interest");
const policy = await readValidator("aada_nft.aada_nft");

const lender_token_name = await Deno.readTextFile("./lender_token_name.txt");
const tx_hash = await Deno.readTextFile("./repay_utxo.txt");

const valid_to = 1676868766000;

const utxo = { txHash: tx_hash, outputIndex: 0 };

const redeemer = Data.to(
  new Constr(0, [1n])
  );



const mint_redeemer = Data.to(
  new Constr(0, 
    [
      new Constr(1, [lender_token_name])
    ])); // Supposed token name

const txUnlock = await unlock(utxo, { from: validator, using: redeemer, mint_validator: policy, mint_redeemer: mint_redeemer, burning_token_name: lender_token_name });

await lucid.awaitTx(txUnlock);

console.log(`1 ADA recovered from the contract
  Tx ID: ${txUnlock}
  Redeemer: ${redeemer}
`);

// --- Supporting functions

async function unlock(ref, { from, using, mint_validator, mint_redeemer, burning_token_name }): Promise<TxHash> {
const [utxo] = await lucid.utxosByOutRef([ref]);
const policyId: PolicyId = lucid.utils.mintingPolicyToId(
  mint_validator
);



const tx = await lucid
  .newTx()
  .collectFrom([utxo], using)
  .attachSpendingValidator(from)
  .mintAssets({[toUnit(policyId, lender_token_name)]: -1n,}, mint_redeemer)
  .attachMintingPolicy(mint_validator)
  .validTo(valid_to)
  .complete();
console.log("tx_created")

const signedTx = await tx
  .sign()
  .complete();

return signedTx.submit();
}

async function readValidator(validator_name): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("./plutus.json")).validators.find((v) => v.title === validator_name);
  return {
    type: "PlutusV2",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}