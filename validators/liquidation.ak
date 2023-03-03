use aiken/transaction.{ScriptContext}
use aiken/transaction/value.{PolicyId}
use types.{LiquidationDatum}
use utils

type Redeemer {
  some_int: Int,
}

validator liquidation {
  fn(datum: LiquidationDatum, redeemer: Redeemer, ctx: ScriptContext) {
    let borrower_policy: PolicyId =
      #"0fe20365f66016154df350e2f13ae2412d2cd08554b48b18668e9228"

    utils.validate_token_mint(
      ctx.transaction.mint,
      (borrower_policy, datum.borrower_tn, -1),
    )
  }
}
