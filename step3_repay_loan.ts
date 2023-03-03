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

const validator = await readValidator("collateral.collateral");
const policy = await readValidator("aada_nft.aada_nft");

const tx_hash = await Deno.readTextFile("./provide_loan_utxo.txt");
const lender_token_name = await Deno.readTextFile("./lender_token_name.txt");
const borrower_token_name = await Deno.readTextFile("./borrower_token_name.txt");

const datum = Data.to(
  new Constr(0, [lender_token_name]) // Lender TN
  );

const utxo = { txHash: tx_hash, outputIndex: 0 };

const redeemer = Data.to(
  new Constr(0, [1n])
  );

const interestValidator = await readValidator("interest.interest");
const txUnlock = await unlock(utxo, { from: validator, into: interestValidator, using: redeemer, mint_validator: policy, datum:datum, borrower_token_name:borrower_token_name });

await lucid.awaitTx(txUnlock);

await Deno.writeTextFile('./repay_utxo.txt', txUnlock);

console.log(`1 ADA recovered from the contract
  Tx ID: ${txUnlock}
  Redeemer: ${redeemer}
`);

// --- Supporting functions

async function unlock(ref, { from, into, using, mint_validator, datum, borrower_token_name }): Promise<TxHash> {
const [utxo] = await lucid.utxosByOutRef([ref]);
const policyId: PolicyId = lucid.utils.mintingPolicyToId(
  mint_validator
);


const mint_redeemer = Data.to(
  new Constr(0, 
    [
      new Constr(1, [borrower_token_name])
    ])); // Supposed token name

console.log("Token to burn ", policyId);

const contractAddress = lucid.utils.validatorToAddress(into);

const tx = await lucid
  .newTx()
  .collectFrom([utxo], using)
  .attachSpendingValidator(from)
  .payToContract(contractAddress, { inline: datum }, {lovelace: 12000000}) // Collateral 
  .mintAssets({[toUnit(policyId, borrower_token_name)]: -1n,}, mint_redeemer)
  .attachMintingPolicy(mint_validator)
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