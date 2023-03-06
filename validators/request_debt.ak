use aiken/list
use aiken/transaction.{InlineDatum, OutputReference, ScriptContext, Spend}
use aiken/transaction/credential.{Address}
use aiken/transaction/value.{AssetName, PolicyId, flatten, quantity_of}
// Custom utils and types
use types.{RequestDatum}
use utils

type RequestRedeemer {
  ProvideLoan(AssetName)
  // Borrower tokenName
  CancelRequest(Int)
}

type Redeemer {
  action: RequestRedeemer,
}

// Collateral output is correct (Checks: collatera value, collateral datum, Loan start posix, lender TN, no token DoS)
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
}

fn validate_loan(
  ctx: ScriptContext,
  datum: RequestDatum,
  borrower_tn: AssetName,
  borrower_policy: PolicyId,
  collateral_address: Address,
  output_ref: OutputReference,
) -> Bool {
  let expected_datum =
    RequestDatum {
      borrower_tn,
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
      lender_tn: datum.lender_tn,
      lend_time: utils.get_lower_bound(ctx.transaction.validity_range),
    }

  let minted_borrower_nft =
    utils.validate_token_mint(
      ctx.transaction.mint,
      (borrower_policy, borrower_tn, 1),
    )
  let request_not_expired =
    utils.validate_expiration(
      ctx.transaction.validity_range,
      datum.request_expiration_time,
    )

  let valid_collateral_output =
    validate_collateral_output(ctx, expected_datum, datum, collateral_address)

  let only_one_contract_input =
    list.length(utils.get_own_validator_inputs(ctx, output_ref)) == 1

  // Perform final validation
  minted_borrower_nft && request_not_expired && valid_collateral_output && only_one_contract_input
}

fn validate_cancel(
  ctx: ScriptContext,
  datum: RequestDatum,
  lender_policy: PolicyId,
) -> Bool {
  utils.validate_token_mint(
    ctx.transaction.mint,
    (lender_policy, datum.lender_tn, -1),
  )
}

validator request {
  fn(datum: RequestDatum, redeemer: Redeemer, ctx: ScriptContext) -> Bool {
    when redeemer.action is {
      ProvideLoan(borrower_tn) -> {
        // Contracts info - should be parameterized
        let borrower_policy: PolicyId =
          #"0fe20365f66016154df350e2f13ae2412d2cd08554b48b18668e9228"
        let collateral_address: Address =
          utils.scripthash_address(
            #"9f0b484d5860b6746ff652747ca3271330c413d4c13fe2de680a6f97",
          )
        when ctx.purpose is {
          Spend(output_ref) ->
            validate_loan(
              ctx,
              datum,
              borrower_tn,
              borrower_policy,
              collateral_address,
              output_ref,
            )
          _ -> False
        }
      }
      CancelRequest(_) -> {
        // Contract info - should be parameterized
        let lender_policy: PolicyId =
          #"0fe20365f66016154df350e2f13ae2412d2cd08554b48b18668e9228"
        validate_cancel(ctx, datum, lender_policy)
      }
    }
  }
}
