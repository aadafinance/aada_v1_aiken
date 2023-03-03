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

let paymentKeyHash = "72c0a5fdf0fcdd32555c357539a872d490646ecfa7189c8070a24e48"; //pkh of addr_test1vpevpf0a7r7d6vj4ts6h2wdgwt2fqerwe7n338yqwz3yujq90eqq4

lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./key.sk"));

console.log("Wallet address is", lucid.wallet.address())
// console.log(await lucid.wallet.getUtxos());

const validator = await readValidator("request.request");

console.log("Validator address is", lucid.utils.validatorToAddress(validator));

const txLock = await lock_tokens(2000000, validator);

await Deno.writeTextFile('./loan_request_utxo.txt', txLock);


console.log(`Locked. Tx ID: ${txLock}
`);

// --- Supporting functions

async function lock_tokens(lovelace, into): Promise<TxHash>{

const tx_hash = Deno.args[0]
  
const tx_hash_in_bytes = fromHex(tx_hash);

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

const minting_validator = await readValidator("aada_nft.aada_nft");

const policyId: PolicyId = lucid.utils.mintingPolicyToId(
  minting_validator
);
  
const datum = Data.to(
  new Constr(0,
      [
          toHex(sha256(tx_hash_in_bytes)),
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
          "ff", // Lender NFT
          123n // Lend date
      ]
  ));

  console.log(await (lucid.wallet.getUtxos()))

  const contractAddress = lucid.utils.validatorToAddress(into);
  
  const tx = await lucid
    .newTx()
    .payToContract(contractAddress, { inline: datum }, { lovelace })
    .mintAssets({
      [toUnit(policyId, toHex(sha256(tx_hash_in_bytes)))]: 1n,
    }, mint_redeemer)
    .attachMintingPolicy(minting_validator)
    .complete();

  console.log(tx.toHex);

  const signedTx = await tx
    .sign()
    .complete();

  await Deno.writeTextFile('./borrower_token_name.txt', toHex(sha256(tx_hash_in_bytes)));

  console.log("Token name", toHex(sha256(tx_hash_in_bytes)));

  return signedTx.submit();
}


async function readValidator(validator_name): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("./plutus.json")).validators.find((v) => v.title === validator_name);
  return {
    type: "PlutusV2",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}