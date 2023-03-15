use aiken/transaction.{ScriptContext}
use aiken/transaction/value.{PolicyId}
use types.{InterestDatum}
use utils

type Redeemer {
  some_int: Int,
}

validator interest(lender_policy: PolicyId) {
  fn(datum: InterestDatum, _redeemer: Redeemer, ctx: ScriptContext) {
    utils.validate_token_mint(
      ctx.transaction.mint,
      (lender_policy, datum.lender_tn, -1),
    )
  }
}
