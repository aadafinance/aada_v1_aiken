use aiken/interval.{Finite}
use aiken/list
use aiken/transaction.{InlineDatum, ScriptContext, ValidityRange}
use aiken/transaction/credential.{Address}
use aiken/transaction/value.{
  AssetName, PolicyId, Value, add, flatten, from_asset, quantity_of,
}
use types.{InterestDatum, POSIXTime, RequestDatum}
use utils

type CollateralRedeemer {
  RepayLoan(Int)
  Liquidate(AssetName)
}

type Redeemer {
  action: CollateralRedeemer,
}

// This one is tricky of which I'm not certain!!!
fn check_if_contains_enough_of_value(value: Value, asset_tuple) -> Bool {
  let (av, b, c) = asset_tuple
  quantity_of(value, av, b) >= c
}

// New datum matches the suppose datum (Checks: Loan start posix, lender TN)
fn validate_interest_output(
  ctx: ScriptContext,
  expected_datum: InterestDatum,
  expected_value: Value,
  interest_address: Address,
) -> Bool {
  expect Some(interest_output) = utils.get_address_output(ctx, interest_address)
  expect InlineDatum(interest_datum) = interest_output.datum
  expect interest_datum_typed: InterestDatum = interest_datum

  // Now check if loan and interest is sent to interest SC
  let paid_loan_and_interest =
    list.all(
      flatten(expected_value),
      fn(a) { check_if_contains_enough_of_value(interest_output.value, a) },
    )

  // Interest is as expected
  let datums_matches = interest_datum_typed == expected_datum
  datums_matches && paid_loan_and_interest
}

fn validate_expiration(range: ValidityRange, lower_bound: POSIXTime) -> Bool {
  when range.lower_bound.bound_type is {
    Finite(now) -> now <= lower_bound
    _ -> False
  }
}

// Find interest amount borrower has to pay to lender
fn get_expected_interest(ctx: ScriptContext, datum: RequestDatum) -> Value {
  let current_repay_time = utils.get_upper_bound(ctx.transaction.validity_range)
  let loan_held_interval = current_repay_time - datum.lend_time
  let minimum_interest = datum.interest_amount * 200000 / 1000000
  // Minimum interest must be paid (currently 20% of total interest amount)
  if loan_held_interval <= datum.loan_duration {
    let actual_interest_amount =
      loan_held_interval * datum.interest_amount / datum.loan_duration
    if actual_interest_amount < minimum_interest {
      // Loan recently started. Must pay 20% minimum interest
      from_asset(
        datum.interest_asset.policy_id,
        datum.interest_asset.policy_id,
        minimum_interest,
      )
    } else {
      from_asset(
        datum.interest_asset.policy_id,
        datum.interest_asset.asset_name,
        actual_interest_amount,
      )
    }
  } else {
    // Loan overdue. You must give all interest to lender
    from_asset(
      datum.interest_asset.policy_id,
      datum.interest_asset.asset_name,
      datum.interest_amount,
    )
  }
}

fn validate_repay(
  ctx: ScriptContext,
  request_datum: RequestDatum,
  interest_address: Address,
  borrower_policy: PolicyId,
) -> Bool {
  // Expect that correct lender tokenName is passed to interest datum
  let expected_datum = InterestDatum { lender_tn: request_datum.lender_tn }

  let burned_lender_nft =
    utils.validate_token_mint(
      ctx.transaction.mint,
      (borrower_policy, request_datum.borrower_tn, -1),
    )

  let interest_value = get_expected_interest(ctx, request_datum)
  let loan_value =
    from_asset(
      request_datum.loan_asset.asset_name,
      request_datum.loan_asset.asset_name,
      request_datum.loan_amount,
    )

  let loan_and_interest_value = add(interest_value, loan_value)

  let valid_interest_output =
    validate_interest_output(
      ctx,
      expected_datum,
      loan_and_interest_value,
      interest_address,
    )

  burned_lender_nft && valid_interest_output
}

// Borrower have not paid in time OR loan is undercollaterized
fn validate_liquidate(
  ctx: ScriptContext,
  request_datum: RequestDatum,
  lender_policy: PolicyId,
  oracle_tn: AssetName,
) -> Bool {
  // Lender NFT is burned
  let burned_lender_nft =
    utils.validate_token_mint(
      ctx.transaction.mint,
      (lender_policy, request_datum.lender_tn, -1),
    )
  // Loan is due. Lender can liquidate
  let deadline_passed =
    request_datum.loan_duration + request_datum.lend_time < utils.get_lower_bound(
      ctx.transaction.validity_range,
    )

  // It's different from Haskell since I'm getting 'oracle_tn' from redeemer
  let oracle_token_minted =
    utils.validate_token_mint(
      ctx.transaction.mint,
      (request_datum.liquidate_policy, oracle_tn, 1),
    )

  burned_lender_nft && ( deadline_passed || oracle_token_minted )
}

validator collateral {
  fn(datum: RequestDatum, redeemer: Redeemer, ctx: ScriptContext) -> Bool {
    when redeemer.action is {
      RepayLoan(_) -> {
        // Contracts info - should be parameterized
        let borrower_policy: PolicyId =
          #"0fe20365f66016154df350e2f13ae2412d2cd08554b48b18668e9228"
        let interest_address: Address =
          utils.scripthash_address(
            #"add97b4a3ce5497d15b8b99f583782f6ff9f47c4d17eb286d44f03c5",
          )
        validate_repay(ctx, datum, interest_address, borrower_policy)
      }
      Liquidate(oracle_tn) -> {
        // Contract info - should be parameterized
        let lender_policy: PolicyId =
          #"0fe20365f66016154df350e2f13ae2412d2cd08554b48b18668e9228"
        validate_liquidate(ctx, datum, lender_policy, oracle_tn)
      }
    }
  }
}
