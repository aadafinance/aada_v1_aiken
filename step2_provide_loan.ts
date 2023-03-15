import {
  Data,
  Lucid,
  sha256,
  Blockfrost, 
  PolicyId,
  SpendingValidator,
  toUnit,
  Tx,
  TxHash,
  Constr,
  toHex,
  fromHex,
} from "https://deno.land/x/lucid@0.9.2/mod.ts";;

import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";

const lucid = await Lucid.new(
  new Blockfrost(
    "https://cardano-preprod.blockfrost.io/api/v0",
    "preprodvm2DiKlh4apcEUi2imKSPakELefRjNJp",
  ),
  "Preprod",
);

await lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./lender.sk"));

const request_validator = await readValidator("request.request");
const collateral_validator = await readValidator("collateral.collateral");
const minting_policy = await lenderMintingPolicy();

console.log(await lucid.wallet.getUtxos());

const validFrom = new Date().getTime() - 600000;
// const validTo = validFrom + 100000000;
const validTo = 1678987972000;

// 1679394818000n

const tx_hash_for_nft = Deno.args[0]
const tx_index = Deno.args[1]

let paymentKeyHash = "1c5c2127e2e0a8ab547f7b1371a16b1d9e799325757d7bd0fde6935d";
const borrower_token_name = await Deno.readTextFile("./borrower_token_name.txt");
const tx_hash = await Deno.readTextFile("./loan_request_utxo.txt");

const tx_hash_in_bytes = fromHex("0"+tx_index+tx_hash_for_nft);
console.log(tx_hash_in_bytes);

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
        BigInt(validTo) // Lend date
        // BigInt(2000000) // Due some issues somewhere in Aiken
      ]
));

const utxo = { txHash: tx_hash, outputIndex: 0 };

const redeemer = Data.to(
  new Constr(0, [
    new Constr(0, [toHex(sha256(tx_hash_in_bytes))]
    )]
    )
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
console.log("Minting policy is", policyId);
// const contractAddress = lucid.utils.validatorToAddress(validator, stakeHash);
const stakeHash = lucid.utils.keyHashToCredential("69962602a7025d4163233855c5a379313b27239b8623ad53540815cb");
// const stakeHash = lucid.utils.keyHashToCredential("c022601efcf8f4e9209c95b31a3944458b00c29496ceb92e1dbc7907"); // This is bad stake hash

const collateralAddress = lucid.utils.validatorToAddress(collateral_validator, stakeHash);

console.log("Lender token anme", toHex(sha256(tx_hash_in_bytes)));
const mint_redeemer = Data.to(
  new Constr(0, 
    [
      new Constr(0, [
        new Constr(0, [
        new Constr(0, [tx_hash_for_nft]), 
        BigInt(tx_index)
      ]),
    ]),
    ]
      ));
console.log("Minting redeemer", mint_redeemer);
console.log("Collateral address", collateralAddress);
const tx = await lucid
  .newTx()
  .collectFrom([utxo], using)
  .attachSpendingValidator(from)
  .payToContract(collateralAddress, { inline: datum }, {lovelace: 5000000}) // Collateral 
  .payToAddress("addr_test1vqw9cgf8uts232650aa3xudpdvweu7vny46h677slhnfxhgas4ejg", {
    lovelace: 2000000,}) // Borrower
  .mintAssets({[toUnit(policyId, toHex(sha256(tx_hash_in_bytes)))]: 1n,}, mint_redeemer)
  .attachMintingPolicy(mint_validator)
  .validFrom(validFrom)
  .validTo(validTo)
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


async function lenderMintingPolicy(): Promise<SpendingValidator> {
  return {
    type: "PlutusV2",
    script: toHex(cbor.encode(fromHex("59040c01000033232323232323232323223222533300732323232533300b3370e002900009919191919191919191919191919191919299980e19b87001480004c8c8c8c8c8c8c8c8c94ccc0954ccc09400c400852808008a50337106eb4cc070c07401d20024820010c8c8cc88c8c94ccc0a4cdc3800a4000264944c08800852818151baa00133003001253330283375e6604060426604060420029000240006604060420069000099b87375a6604060426604060420029000240046eb4cc080c08400d200214a00106eb0cc074c078cc074c07807d200048000c0040048894ccc0a80084cdd2a400497ae0132325333028300300213374a90001981680125eb804ccc01401400400cc0b800cc0b0008cc024dd59980d180d9980d180d80e240009004000998131ba90153302637520026604c6ea120024bd70191b920010013322337160020040026eb4cc05cc0600092002375c6602c602e6602c602e0029000240006046002602a00426464646600c6eaccc05cc060cc05cc060065200048020004cc08cdd4809198119ba900133023375066e052000480092f5c06eb8c08c004c054008c074dd500099809180980aa4000446464a66603a66e1c00520001323322323370e601a646018002664464664464a66604e66e1c00520021002132320013756605c002604000660506ea80080052f5bded8c066446601a00400200400200600290011bae3026001005004301600214a0603c6ea8004cc034c8ccc888ccc03c00c008004004888ccc888ccc04000c008004008888cc09cdd3998139ba90063302737520066604e6ea00092f5c000200297ae000223375e6e9c004dd38011800800911299980f001099ba5480092f5c0264646464a66603c66e3c0140044cdd2a4000660466e980092f5c0266600e00e00600a6eb8c07c00cdd5980f80118110019810001180080091299980d8008a5eb804c8c8c8c8cc080dd4800998030030019bae301c003375a6038004603e004603a002600200244a6660320022900009919b8048008cc00c00c004c070004c00400488894ccc06400c40044c8c8c8c8ccc018004008cccc02002000c018014dd7180d0019bad301a002301d004301b00330010012222533301700310011323232323330060010023333008008003006005375c60300066eacc060008c06c010c06400cc0040048894ccc0500084cdd2a400497ae0132325333012300300213374a90001980b9ba70024bd700999802802800801980c0019bac3016002375c602400260080042940c030dd5000998009801001a400444646660020029000001911199980699b870040020132333004004337000069001180a800800918059baa001149858dd6800980080091129998040010a4c26600a600260140046660060066016004002ae695cdaab9d5573caae7d5d02ba1574498101000001"))),
  };
}