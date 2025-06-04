import functions as blockchain
import argparse
from bitcoinrpc.authproxy import JSONRPCException

### Definitions and functionality of the commands called from CLI

def get_block(block_id, show_transactions=False, height=False): #this command is used to display basic information about a block based on provided hash or block height
    if height:
        hash = blockchain.get_block_hash(int(block_id))
        block_id = hash
    try:
        block = blockchain.get_block(block_id)
        time = blockchain.get_object_time(block['time'])
        print(f'Block height: {block['height']}\n') # if verbose enabled probably
        print(f'Block hash: {block_id}')
        print(f'Block time: {time}')
        print(f'Number of transactions: {block['nTx']}')
        if show_transactions == True:
            print('\nTransactions:\n')
            i = 1
            for item in block['tx']:
                print(f'{i}: {item}')
                i += 1

    except JSONRPCException as e:
        print(f'RPC error:\n{e}')
    except Exception as e:
        print('Unknown error encountered.\n')
        print(e)

def get_height(height):
    try:
        hash= blockchain.get_block_hash(int(height))
        get_block(hash)
    except Exception as e:
        print(e)

def get_tx(txid, wallet_info=False): #this command is used to display basic information about a transaction based on a provided transaction id (txid)
    try:
        # basic transaction info
        transaction = blockchain.get_transaction(txid)
        unix_time = transaction['time']
        time = blockchain.get_object_time(unix_time)
        version = transaction['version']
        
        print(f'Txid = {transaction['txid']}')
        print(f'Time = {time}')
        print(f'Version: {version}')

        # TRANSACTION INPUTS
        print('\nINPUTS:\n')
        print(f'Number of inputs = {len(transaction['vin'])}')
        i = 1
        for item in transaction['vin']:
            print(f'{i}.')
            try: 
                item['coinbase']
                print('Coibase transaction: reward for mined block.')
                print(f'Coinbase data: {item['coinbase']}')
                continue
            except:
                print(f'    Txid = {item['txid']}')
                input_transaction = blockchain.get_transaction(item['txid'])
                tx_details = input_transaction['vout'][item['vout']]
                try: 
                    address = tx_details["scriptPubKey"]["address"]
                except:
                    address = 'Not found'
                if wallet_info == True and address != 'Not found':
                    print(f'    Address = {address}' + f' ({blockchain.identify_wallet(address)})')
                else: 
                    print(f'    Address = {address}')
                print(f'    Value = {tx_details["value"]}')
                i += 1
        
        # TRANSACTION OUTPUTS
        print('\nOUTPUTS:\n')
        print(f'Number of outputs = {len(transaction['vout'])}')
        i = 1
        for item in transaction['vout']:
            print(f'{i}.')
            try: 
                address = item["scriptPubKey"]["address"]
            except:
                address = 'Not found'            
            if wallet_info == True and address != 'Not found':
                print(f'    Address = {address}' + f' ({blockchain.identify_wallet(address)})')
            else: 
                print(f'    Address = {address}')            
            print(f'    Value = {item['value']}') 
            i += 1
        print(f'\nBlockhash = {transaction['blockhash']}')
    
    # Exceptions
    except JSONRPCException as e:
            print(f'RPC error:\n{e}')
    except Exception as e:
            print('Unknown error encountered.\n')
            print(e)

def wallet_info(wallet): #this command is used to display basic information about the wallet, such as type, derived from the wallet address
    print(f"wallet_info called with wallet={wallet}\n")
    print(blockchain.identify_wallet(wallet))

def utxo_scan(wallet):
    print("Scan launched.")
    result = blockchain.scantxoutset([wallet])
    print(result)


# Main function to handle CLI commands
def main():
    # Initialize the ArgumentParser
    parser = argparse.ArgumentParser(description="Bitcoin on-chain analysis")

    # Define the subcommands (methods)
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Get_block parser
    block_parser = subparsers.add_parser('block', help="Get block details for the given block ID")
    block_parser.add_argument('block_id', type=str, help="Block ID")
    block_parser.add_argument('-t', '--transactions', action='store_true', help="Show transactions in the block (optional)")
    block_parser.add_argument('-H', '--height', action='store_true', help="Get block details for the given block height (optional)")

    # Get_height parser
    height_parser = subparsers.add_parser('height', help="Get block details from block height")
    height_parser.add_argument('height', type=str, help="Block height")
    
    # Get_transaction parser
    tx_parser = subparsers.add_parser('transaction', help="Get transaction details from txid")
    tx_parser.add_argument('txid', type=str, help="Transaction ID")
    tx_parser.add_argument('-w', '--wallets', action='store_true', help="Identify wallet types based on addresses")

    # Wallet_info parser
    wallet_parser = subparsers.add_parser('wallet', help="Get wallet info from wallet address")
    wallet_parser.add_argument('wallet_address', type=str, help="Wallet address")

    # Utxo scan parser
    utxo_parser = subparsers.add_parser('utxo', help="Launch a utxo scan")
    utxo_parser.add_argument('wallet_address', type=str, help="Wallet address")
    
    args = parser.parse_args()

    # Read user input
    if args.command == "block":
        get_block(args.block_id, show_transactions=args.transactions, height=args.height)
    elif args.command == "transaction":
        get_tx(args.txid, wallet_info=args.wallets)
    elif args.command == "wallet":
        wallet_info(args.wallet_address)
    elif args.command == "height":
        get_height(args.height)
    elif args.command == "utxo":
        utxo_scan(args.wallet_address)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
