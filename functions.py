from bitcoinrpc.authproxy import AuthServiceProxy
import datetime

# Configuration - rpc_user and rpc_password are set in the bitcoin.conf file
rpc_user = 'Wojtek'
rpc_password = 'test'
rpc_host = '127.0.0.1'
rpc_port = '8332'

#połączenie z serwerem
def get_rpc_client(timeout):
    rpc_client = AuthServiceProxy(f"http://{rpc_user}:{rpc_password}@{rpc_host}:{rpc_port}", timeout=timeout)
    return rpc_client

def count_blocks(): #informacje o blockchainie - ilość bloków
    rpc_client = get_rpc_client(60)
    block_count = rpc_client.getblockcount()
    return block_count

def identify_wallet(wallet):
    if wallet[:4] == 'bc1q':
        if len(wallet) == 42:
            wallet_type = 'SegWit (P2WPKH)'
        if len(wallet) == 62:
            wallet_type = 'Wrapped SegWit (P2WSH)'
    elif wallet[:4] == 'bc1p':
        wallet_type = 'Taproot (P2TR)'
    elif wallet[0] == '3':
        wallet_type = 'P2SH'
    elif wallet[0] == '1':
        wallet_type = 'P2PKH (Legacy)'
    elif wallet[0] == '2':
        wallet_type = 'Testnet'
    else: raise ValueError("Invalid address. Please provide a valid bitcoin address.")
    return wallet_type

def get_block(blockhash): # blok
    try: 
        rpc_client = get_rpc_client(60)
        block = rpc_client.getblock(blockhash) 
        return block
    except Exception as e:
        return "Error: " + e

def get_block_hash(block_height):
    try: 
        rpc_client = get_rpc_client(60)
        blockhash = rpc_client.getblockhash(block_height)
        return blockhash
    except Exception as e:
        return "Error: " + e

#zapytanie o informacje dot. transakcji z danego bloku
def get_transaction(txid):
    try:
        rpc_client = get_rpc_client(60)
        transaction = rpc_client.getrawtransaction(txid, True)
        return transaction
    except Exception as e:
        return "Error: " + e

def get_object_time(unix_time):
    dt = datetime.datetime.fromtimestamp(unix_time)
    last_date = dt.strftime("%H:%M.%S, %d-%m-%Y")
    return last_date    

def last_block_time(): #data ostatniego bloku
    rpc_client = get_rpc_client(60)
    block_count = rpc_client.getblockcount()
    blockhash = rpc_client.getblockhash(block_count)
    block = get_block(blockhash)
    last_time = block.get('time')
    dt = datetime.datetime.fromtimestamp(last_time)
    last_date = dt.strftime("%H:%M.%S, %d-%m-%Y")
    print(f"Last block at: {last_date}\n")
    return last_time #printuje date w standardowym czasie ale zwraca w unix time

# printuje podstawowe info dot. danej transakcji na podstawie txid
def basic_transaction_info(txid):
    transaction = get_transaction(txid)
    tx_size = transaction['size']
    tx_weight = transaction['weight']
    tx_vin = transaction['vin']
    print(f'Inbound transaction:\n{tx_vin}')
    tx_vout = transaction['vout']
    print(f'Outbound transaction:\n{tx_vout[0]}')
    tx_time = transaction['time']
    dt = datetime.datetime.fromtimestamp(tx_time)
    tx_date = dt.strftime("%H:%M.%S, %d-%m-%Y")
    print(f'Transaction info:\n\nTransaction id/hash = {txid}\nSize = {tx_size}\nWeight = {tx_weight}\nNo. of transactions in: {len(tx_vin)}\nNo. of transactions out: {len(tx_vout)}\nClose time: {tx_date}\n')

def get_transaction_inputs_outputs(txid):
    transaction = get_transaction(txid)
    tx_vin = transaction['vin']
    print('Number of inbound transactions:' + str(len(tx_vin)) + '\n' )
    i = 1
    for item in tx_vin:
        print(f'Inbound transaction no. {i}: {item}')
        i += 1
    tx_vout = transaction['vout']
    print(f'Number of outbound transactions:' + str(len(tx_vout)) + '\n')
    i = 1
    for item in tx_vout:
        print(f'Outbound transaction no. {i}: {item}')
        i += 1



# TEST FUNCTIONS


def scantxoutset(addresses):
    rpc_client = get_rpc_client(1200)
    descriptors = [f"addr({addr})" for addr in addresses]
    return rpc_client.scantxoutset("start", descriptors)

