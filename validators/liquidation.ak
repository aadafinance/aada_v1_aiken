use aiken/transaction.{ScriptContext}
use aiken/transaction/value.{PolicyId}
use types.{LiquidationDatum}
use utils

type Redeemer {
  some_int: Int,
}

validator liquidation(borrower_policy: PolicyId) {
  fn(datum: LiquidationDatum, _redeemer: Redeemer, ctx: ScriptContext) {
    utils.validate_token_mint(
      ctx.transaction.mint,
      (borrower_policy, datum.borrower_tn, -1),
    )
  }
}
