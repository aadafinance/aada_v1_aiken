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
} from "https://deno.land/x/lucid@0.9.2/mod.ts";;

import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";

const lucid = await Lucid.new(
  new Blockfrost(
    "https://cardano-preprod.blockfrost.io/api/v0",
    "preprodvm2DiKlh4apcEUi2imKSPakELefRjNJp",
  ),
  "Preprod",
);

await lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./key.sk"));

const request_validator = await readValidator("request.request");
const collateral_validator = await readValidator("collateral.collateral");
const minting_policy = await readValidator("aada_nft.aada_nft");

const valid_from = 1676463607000;
const valid_to = 1676563607000;

// 1679394818000n
const tx_hash = await Deno.readTextFile("./loan_request_utxo.txt");
let paymentKeyHash = "72c0a5fdf0fcdd32555c357539a872d490646ecfa7189c8070a24e48";
const borrower_token_name = await Deno.readTextFile("./borrower_token_name.txt");


const tx_hash_in_bytes = fromHex(tx_hash);

console.log(borrower_token_name);

const datum = Data.to(
new Constr(0,
    [
        borrower_token_name,
        new Constr(0, [
          new Constr(0, [
            paymentKeyHash
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
        10000000n,
        new Constr(0, [ // collateral asset
            "",
            ""
        ]),
        3000000n,
        34000n,
        "ff",
        1123n,
        1123n,
        1679394818000n, // Expiration TS (ms)
        toHex(sha256(tx_hash_in_bytes)), // Lender NFT
        BigInt(valid_from) // Lend date
      ]
));

const utxo = { txHash: tx_hash, outputIndex: 0 };

const redeemer = Data.to(
  new Constr(0, [toHex(sha256(tx_hash_in_bytes))])
  );

const txUnlock = await unlock(utxo, { from: request_validator, using: redeemer, mint_validator: minting_policy, collateral_validator: collateral_validator, datum:datum });

await lucid.awaitTx(txUnlock);

await Deno.writeTextFile('./provide_loan_utxo.txt', txUnlock);

console.log(`1 ADA recovered from the contract
  Tx ID: ${txUnlock}
  Redeemer: ${redeemer}
`);

// --- Supporting functions

async function unlock(ref, { from, using, mint_validator, collateral_validator, datum }): Promise<TxHash> {
const [utxo] = await lucid.utxosByOutRef([ref]);
const policyId: PolicyId = lucid.utils.mintingPolicyToId(
  mint_validator
);


const collateralAddress = lucid.utils.validatorToAddress(collateral_validator);

console.log("Lender token anme", toHex(sha256(tx_hash_in_bytes)));
const mint_redeemer = Data.to(
  new Constr(0, 
    [
      new Constr(0, [
        new Constr(0, [
        new Constr(0, [tx_hash]), 
        2n
      ]),
    ]),
    ]
      ));

console.log("Collateral address", collateralAddress);
const tx = await lucid
  .newTx()
  .collectFrom([utxo], using)
  .attachSpendingValidator(from)
  .payToContract(collateralAddress, { inline: datum }, {lovelace: 5000000}) // Collateral 
  .payToAddress("addr_test1vpevpf0a7r7d6vj4ts6h2wdgwt2fqerwe7n338yqwz3yujq90eqq4", {
    lovelace: 2000000,}) // Borrower
  .mintAssets({[toUnit(policyId, toHex(sha256(tx_hash_in_bytes)))]: 1n,}, mint_redeemer)
  .attachMintingPolicy(mint_validator)
  .validFrom(valid_from)
  .validTo(valid_to)
  .complete();
console.log("tx_created")

const signedTx = await tx
  .sign()
  .complete();

  await Deno.writeTextFile('./lender_token_name.txt', toHex(sha256(tx_hash_in_bytes)));

return signedTx.submit();
}

async function readValidator(validator_name): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("./plutus.json")).validators.find((v) => v.title === validator_name);
  return {
    type: "PlutusV2",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}