use aiken/dict
use aiken/interval.{Finite}
use aiken/list
use aiken/option
use aiken/transaction.{
  Input, Output, OutputReference, ScriptContext, ValidityRange,
}
use aiken/transaction/credential.{
  Address, Credential, Inline, ScriptCredential, VerificationKeyCredential,
}
use aiken/transaction/value.{PolicyId, Value, flatten, tokens}
use types.{POSIXTime, ValidatorHash}

pub fn own_validator_script_address_hash(
  inputs: List<Input>,
  output_reference: OutputReference,
) -> Option<ValidatorHash> {
  inputs
  |> list.find(fn(input) { input.output_reference == output_reference })
  |> option.map(fn(v) { v.output })
  |> option.map(fn(v) { v.address })
  |> option.map(fn(v) { v.payment_credential })
  |> option.map(
    fn(v) {
      when v is {
        ScriptCredential(hash) -> Some(hash)
        _ -> None
      }
    },
  )
  |> option.flatten()
}

pub fn get_own_validator_address(
  ctx: ScriptContext,
  output_reference: OutputReference,
  stake_hash,
) -> Address {
  expect Some(validator_hash) =
    own_validator_script_address_hash(ctx.transaction.inputs, output_reference)
  scripthash_address(validator_hash, stake_hash)
}

pub fn scripthash_address(scripthash: ByteArray, stake_hash: ByteArray) {
  Address {
    payment_credential: ScriptCredential(scripthash),
    stake_credential: Some(Inline(VerificationKeyCredential(stake_hash))),
  }
}

pub fn get_address_output(
  ctx: ScriptContext,
  output_address: Address,
) -> Option<Output> {
  list.find(
    ctx.transaction.outputs,
    fn(output) { output.address == output_address },
  )
}

// Validate that token is minted and only one tokenName with provided policy
pub fn validate_token_mint(
  mints: Value,
  expected_minting: (ByteArray, ByteArray, Int),
) -> Bool {
  when list.find(flatten(mints), fn(mint) { mint == expected_minting }) is {
    Some(_) -> only_one_token_in_policy_minted(mints, expected_minting)
    None -> False
  }
}

// Make sure only one token is minted from the asset tuple
fn only_one_token_in_policy_minted(mints, expected_minting) {
  let (policy_id, _, _) = expected_minting
  let policy_id: PolicyId = policy_id
  // Check for the policy mints
  list.length(dict.keys(tokens(mints, policy_id))) == 1
  // Total count of minted unique tokens with policy is 1
}

pub fn get_lower_bound(range: ValidityRange) -> Int {
  expect Finite(lower_bound) = range.lower_bound.bound_type
  lower_bound
}

pub fn get_upper_bound(range: ValidityRange) -> Int {
  expect Finite(upper_bound) = range.upper_bound.bound_type
  upper_bound
}

// Get all validator inputs
pub fn get_own_validator_inputs(
  ctx: ScriptContext,
  output_reference,
  stake_hash,
) -> List<Input> {
  let script_own_address =
    get_own_validator_address(ctx, output_reference, stake_hash)

  // Get all inputs from the transaction
  list.filter(
    ctx.transaction.inputs,
    fn(input) { input.output.address == script_own_address },
  )
}

pub fn get_validators_inputs(ctx: ScriptContext) -> List<Input> {
  list.filter(
    ctx.transaction.inputs,
    fn(input) { is_script_credential(input.output.address.payment_credential) },
  )
}

pub fn is_script_credential(credential: Credential) -> Bool {
  when credential is {
    ScriptCredential(_validator_hash) -> True
    _ -> False
  }
}

pub fn validate_expiration(
  range: ValidityRange,
  expiration_time: POSIXTime,
) -> Bool {
  when range.upper_bound.bound_type is {
    Finite(now) -> now <= expiration_time
    _ -> False
  }
}
