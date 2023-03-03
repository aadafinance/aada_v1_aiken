use aiken/hash.{Blake2b_224, Hash}
use aiken/transaction/credential.{Address, Script}
use aiken/transaction/value.{AssetName, PolicyId}

pub type POSIXTime =
  Int

pub type CurrencySymbol {
  policy_id: PolicyId,
  asset_name: AssetName,
}

pub type RequestDatum {
  borrower_tn: AssetName,
  borrower_address: Address,
  loan_asset: CurrencySymbol,
  loan_amount: Int,
  interest_asset: CurrencySymbol,
  interest_amount: Int,
  collateral_asset: CurrencySymbol,
  collateral_amount: Int,
  loan_duration: Int,
  liquidate_policy: PolicyId,
  collateral_factor: Int,
  liquidation_commision: Int,
  request_expiration_time: POSIXTime,
  lender_tn: AssetName,
  lend_time: Int,
}

pub type InterestDatum {
  lender_tn: AssetName,
}

pub type LiquidationDatum {
  borrower_tn: AssetName,
}

pub type ValidatorHash =
  Hash<Blake2b_224, Script>
