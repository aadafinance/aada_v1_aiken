use aiken/list
use aiken/transaction.{
  InlineDatum, Output, OutputReference, ScriptContext, Spend,
}
use aiken/transaction/credential.{Address}
use aiken/transaction/value.{AssetName, PolicyId, flatten, quantity_of}
// Custom utils and types
use types.{AssetClass, RequestDatum}
use utils

type RequestRedeemer {
  ProvideLoan(AssetName)
  // Lender Token name
  CancelRequest(Int)
}

type Redeemer {
  action: RequestRedeemer,
}

// Loan is sent to borrower
fn paid_borrower(
  tx_outputs: List<Output>,
  borrower_address: Address,
  loan_asset: AssetClass,
  loan_amount: Int,
) -> Bool {
  expect Some(output_to_borrower) =
    list.find(tx_outputs, fn(output) { output.address == borrower_address })
  // Should trace some error since hard to find issue
  quantity_of(
    output_to_borrower.value,
    loan_asset.policy_id,
    loan_asset.asset_name,
  ) >= loan_amount
}

// Collateral output is correct (Checks: collateral value, collateral datum, Loan start posix, lender TN, no token DoS)
fn validate_collateral_output(
  ctx: ScriptContext,
  expected_datum: RequestDatum,
  datum: RequestDatum,
  collateral_address: Address,
) -> Bool {
  expect Some(collateral_output) =
    utils.get_address_output(ctx, collateral_address)

  expect InlineDatum(collateral_datum) = collateral_output.datum
  expect collateral_datum_typed: RequestDatum = collateral_datum

  // Collateral value is correct
  let collateral_amount_is_correct =
    quantity_of(
      collateral_output.value,
      datum.collateral_asset.policy_id,
      datum.collateral_asset.asset_name,
    ) >= datum.collateral_amount
  let datums_matches = collateral_datum_typed == expected_datum

  let no_token_dos = list.length(flatten(collateral_output.value)) <= 3

  datums_matches && collateral_amount_is_correct && no_token_dos
  // Output datum matches the expected datum
}

fn validate_loan(
  ctx: ScriptContext,
  datum: RequestDatum,
  lender_tn: AssetName,
  lender_policy: PolicyId,
  collateral_address: Address,
  output_ref: OutputReference,
  stake_hash,
) -> Bool {
  let expected_datum =
    RequestDatum {
      borrower_tn: datum.borrower_tn,
      borrower_address: datum.borrower_address,
      loan_asset: datum.loan_asset,
      loan_amount: datum.loan_amount,
      interest_asset: datum.interest_asset,
      interest_amount: datum.interest_amount,
      collateral_asset: datum.collateral_asset,
      collateral_amount: datum.collateral_amount,
      loan_duration: datum.loan_duration,
      liquidate_policy: datum.liquidate_policy,
      collateral_factor: datum.collateral_factor,
      liquidation_commision: datum.liquidation_commision,
      request_expiration_time: datum.request_expiration_time,
      lender_tn,
      lend_time: utils.get_upper_bound(ctx.transaction.validity_range),
    }

  let paid_borrower =
    paid_borrower(
      ctx.transaction.outputs,
      datum.borrower_address,
      datum.loan_asset,
      datum.loan_amount,
    )

  let minted_lender_nft =
    utils.validate_token_mint(
      ctx.transaction.mint,
      (lender_policy, lender_tn, 1),
    )
  let request_not_expired =
    utils.validate_expiration(
      ctx.transaction.validity_range,
      datum.request_expiration_time,
    )

  let valid_collateral_output =
    validate_collateral_output(ctx, expected_datum, datum, collateral_address)

  let only_one_contract_input =
    list.length(utils.get_own_validator_inputs(ctx, output_ref, stake_hash)) == 1

  let only_one_validator_input =
    list.length(utils.get_validators_inputs(ctx)) == 1

  // Perform final validation
  minted_lender_nft && paid_borrower && request_not_expired && valid_collateral_output && only_one_contract_input && only_one_validator_input
}

fn validate_cancel(
  ctx: ScriptContext,
  datum: RequestDatum,
  borrower_policy: PolicyId,
) -> Bool {
  utils.validate_token_mint(
    ctx.transaction.mint,
    (borrower_policy, datum.borrower_tn, -1),
  )
}

validator request(
  borrower_policy: PolicyId,
  lender_policy: PolicyId,
  collateral_script_hash: ByteArray,
  contract_stake_hash,
) {
  fn(datum: RequestDatum, redeemer: Redeemer, ctx: ScriptContext) -> Bool {
    when redeemer.action is {
      ProvideLoan(lender_tn) -> {
        // Contracts info - should be parameterized
        let collateral_address: Address =
          utils.scripthash_address(collateral_script_hash, contract_stake_hash)
        when ctx.purpose is {
          Spend(output_ref) ->
            validate_loan(
              ctx,
              datum,
              lender_tn,
              lender_policy,
              collateral_address,
              output_ref,
              contract_stake_hash,
            )
          _ -> False
        }
      }
      CancelRequest(_) -> validate_cancel(ctx, datum, borrower_policy)
    }
  }
}
