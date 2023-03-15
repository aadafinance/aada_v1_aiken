import json
import subprocess

def read_json_file():
    # Opening JSON file
    f = open('plutus.json')
    
    # returns JSON object as 
    # a dictionary
    data = json.load(f)
    # Closing file
    f.close()
    return data

stake_hash = "69962602a7025d4163233855c5a379313b27239b8623ad53540815cb" # Will read from stake key

# Build contracts
subprocess.check_output("aiken build", stderr=subprocess.STDOUT, shell=True)
command = "aiken blueprint apply --validator aada_nft.aada_nft . \"(con data #{})\"".format("00")
subprocess.check_output(command, stderr=subprocess.STDOUT, shell=True)

# Read lender NFT policy
data = read_json_file()
for i in data['validators']:
    if i['title'] == 'aada_nft.aada_nft':
        nft_hash_lender = i['hash']

# Apply NFT param for borrower
# Build contracts
subprocess.check_output("aiken build", stderr=subprocess.STDOUT, shell=True)
command = "aiken blueprint apply --validator aada_nft.aada_nft . \"(con data #{})\"".format("01")
subprocess.check_output(command, stderr=subprocess.STDOUT, shell=True)

# Read lender NFT policy
data = read_json_file()
for i in data['validators']:
    if i['title'] == 'aada_nft.aada_nft':
        nft_hash_borrower = i['hash']


print("Borrower policy", nft_hash_borrower)
print("Lender policy", nft_hash_lender)
        

# Deploy Interest and Liquidation contracts
deploy_liquidation = "aiken blueprint apply --validator liquidation.liquidation . \"(con data #581c{})\"".format(nft_hash_borrower)
subprocess.check_output(deploy_liquidation, stderr=subprocess.STDOUT, shell=True)
print("Borrower NFT param applied to liquidation")
deploy_interest = "aiken blueprint apply --validator interest.interest . \"(con data #581c{})\"".format(nft_hash_lender)
subprocess.check_output(deploy_interest, stderr=subprocess.STDOUT, shell=True)
print("Lender NFT param applied to liquidation")

# Get required params for SCs
data = read_json_file()
for i in data['validators']:
    if i['title'] == 'interest.interest':
        interest_hash = i['hash']


collateral_1 = "aiken blueprint apply --validator collateral.collateral . \"(con data #581c{})\"".format(nft_hash_lender)
subprocess.check_output(collateral_1, stderr=subprocess.STDOUT, shell=True)
print("Applied lender NFT to collateral")
collateral_2 = "aiken blueprint apply --validator collateral.collateral . \"(con data #581c{})\"".format(interest_hash)
subprocess.check_output(collateral_2, stderr=subprocess.STDOUT, shell=True)
print("Applied interest hash to collateral")
collateral_3 = "aiken blueprint apply --validator collateral.collateral . \"(con data #581c{})\"".format(stake_hash)
subprocess.check_output(collateral_3, stderr=subprocess.STDOUT, shell=True)
print("Applied stake hash to collateral")

# Get required params for SCs
data = read_json_file()
for i in data['validators']:
    if i['title'] == 'collateral.collateral':
        collateral_hash = i['hash']


# Apply params to request SC
request_1 = "aiken blueprint apply --validator request.request . \"(con data #581c{})\"".format(nft_hash_borrower)
subprocess.check_output(request_1, stderr=subprocess.STDOUT, shell=True)
print("Applied borrower NFT to request")
request_2 = "aiken blueprint apply --validator request.request . \"(con data #581c{})\"".format(nft_hash_lender)
subprocess.check_output(request_2, stderr=subprocess.STDOUT, shell=True)
print("Applied lender NFT to request")
request_3 = "aiken blueprint apply --validator request.request . \"(con data #581c{})\"".format(collateral_hash)
subprocess.check_output(request_3, stderr=subprocess.STDOUT, shell=True)
print("Applied collateral hash to request")
request_4 = "aiken blueprint apply --validator request.request . \"(con data #581c{})\"".format(stake_hash)
subprocess.check_output(request_4, stderr=subprocess.STDOUT, shell=True)
print("Applied stake hash to request")



# Apply params to debt request SC
request_debt_1 = "aiken blueprint apply --validator request_debt.request . \"(con data #581c{})\"".format(nft_hash_borrower)
subprocess.check_output(request_debt_1, stderr=subprocess.STDOUT, shell=True)
print("Applied borrower NFT to request_debt")
request_debt_2 = "aiken blueprint apply --validator request_debt.request . \"(con data #581c{})\"".format(nft_hash_lender)
subprocess.check_output(request_debt_2, stderr=subprocess.STDOUT, shell=True)
print("Applied lender hash to request_debt")
request_debt_3 = "aiken blueprint apply --validator request_debt.request . \"(con data #581c{})\"".format(collateral_hash)
subprocess.check_output(request_debt_3, stderr=subprocess.STDOUT, shell=True)
print("Applied collateral hash to request_debt")
request_debt_4 = "aiken blueprint apply --validator request_debt.request . \"(con data #581c{})\"".format(stake_hash)
subprocess.check_output(request_debt_4, stderr=subprocess.STDOUT, shell=True)
print("Applied stake hash to request_debt")