use aiken/bytearray.{push}
use aiken/hash
use aiken/list
use aiken/transaction.{Input, Mint, OutputReference, ScriptContext}
use aiken/transaction/value.{AssetName}
use utils

type RedeemerType {
  MintR(OutputReference)
  BurnR(AssetName)
}

type Redeemer {
  action: RedeemerType,
}

fn utxo_consumed(consumed_utxo: OutputReference, inputs: List<Input>) {
  when
    list.find(
      inputs,
      fn(input) {
        input.output_reference.transaction_id == consumed_utxo.transaction_id && input.output_reference.output_index == consumed_utxo.output_index
      },
    )
  is {
    Some(_) -> True
    None -> False
  }
}

validator aada_nft {
  fn(redeemer: Redeemer, ctx: ScriptContext) {
    when ctx.purpose is {
      Mint(own_policy) ->
        when redeemer.action is {
          MintR(consumed_utxo) -> {
            let consumed_tx_hash = consumed_utxo.transaction_id.hash
            let string_to_hash =
              push(consumed_tx_hash, consumed_utxo.output_index)
            // Adding utxo_id to array start
            let token_name = hash.sha2_256(string_to_hash)
            let expected_minting = (own_policy, token_name, 1)
            let valid_mint =
              utils.validate_token_mint(ctx.transaction.mint, expected_minting)
            let only_one_mint =
              utils.validate_if_only_one_token_minted(ctx.transaction.mint)
            let utxo_consumed =
              utxo_consumed(consumed_utxo, ctx.transaction.inputs)
            let valid_utxo_id = consumed_utxo.output_index < 256
            valid_mint && utxo_consumed && valid_utxo_id && only_one_mint
          }
          BurnR(burn_tn) -> {
            let expected_burn = (own_policy, burn_tn, -1)
            utils.validate_token_mint(ctx.transaction.mint, expected_burn)
          }
        }
      _ -> False
    }
  }
}
