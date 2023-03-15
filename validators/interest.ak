use aiken/transaction.{ScriptContext}
use aiken/transaction/value.{PolicyId}
use types.{InterestDatum}
use utils

type Redeemer {
  some_int: Int,
}

validator interest {
  fn(datum: InterestDatum, _redeemer: Redeemer, ctx: ScriptContext) {
    let lender_policy: PolicyId =
      #"0fe20365f66016154df350e2f13ae2412d2cd08554b48b18668e9228"

    utils.validate_token_mint(
      ctx.transaction.mint,
      (lender_policy, datum.lender_tn, -1),
    )
  }
}
