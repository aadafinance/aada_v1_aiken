import { Lucid } from "https://deno.land/x/lucid@0.8.3/mod.ts";
 
const lucid = await Lucid.new(undefined, "Preview");
 
const LenderKey = lucid.utils.generatePrivateKey();
await Deno.writeTextFile("lender.sk", LenderKey);
 
const lenderAddress = await lucid.selectWalletFromPrivateKey(LenderKey).wallet.address();
await Deno.writeTextFile("lender.addr", lenderAddress);


const borrowerKey = lucid.utils.generatePrivateKey();
await Deno.writeTextFile("borrower.sk", borrowerKey);
 
const borrowerAddress = await lucid.selectWalletFromPrivateKey(borrowerKey).wallet.address();
await Deno.writeTextFile("borrower.addr", borrowerAddress);