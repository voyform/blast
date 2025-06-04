from flask import *
import functions as blast
import threading
import uuid
from datetime import datetime

app = Flask(__name__)


@app.route('/')
def home():
    return render_template('index.html')

@app.route('/search')
def search():
    query = request.args.get('q')
    
    if query.isdigit(): # checks if block height is submitted
        print("Height detected.")
        try:
            print("Fetching hash.")
            hash = blast.get_block_hash(block_height=int(query))
            print(f"Hash found: {hash}")
            print("Fetching block.")
            result = blast.get_block(hash)
            print(f"Block found: {result}")
            if not result: print("Something went wrong. No result obtained.")
            # Return the output from the script
            return jsonify(result)
        except Exception as e:
            return f"Something went wrong: {e}"
        
    if query.startswith("0" * 8) and len(query) == 64: # check if block hash is submitted
        print("Blockhash detected.")
        try:
            result = blast.get_block(query)
            print(result)
            # Return the output from the script
            return jsonify(result)
        except Exception as e:
            return f"Something went wrong: {e}"
    
    if len(query) == 64: # transaction id
        print('Tx id detected.')
        try:
            tx = blast.get_transaction(query)
            print('Tx received.')
            inputs = [] 
            for item in tx['vin']:
                data = {}
                try: 
                    item['coinbase']
                    data['address'] = 'coinbase'
                    data['value'] = '50'
                    inputs.append(data)
                    print('Coinbase transaction added')
                    continue
                except:
                    data['txid'] = item['txid']
                    input_transaction = blast.get_transaction(item['txid'])
                    tx_details = input_transaction['vout'][item['vout']]
                    try: 
                        address = tx_details["scriptPubKey"]["address"]
                        data['address'] = address
                    except:
                        address = 'Not found'
                    data['value'] = tx_details["value"]
                    inputs.append(data)
                    print(f'Tx data appended: {data}')
            print("Appending finished.")
            print(inputs)
            result = tx
            result["blast_inputs"] = inputs
            print(result)
            return jsonify(result)
        except Exception as e:
            print(f"Something went wrong: {e}")
            return "Error."


utxo_store = {}  # job_id -> {'status': 'processing'/'done', 'result': data}
def run_utxo_scan(job_id, query):
    try:
        result = blast.scantxoutset(query)
        utxo_store[job_id] = {
            'status': 'done',
            'result': result
        }
    except Exception as e:
        utxo_store[job_id] = {
            'status': 'error',
            'result': str(e)
        }

@app.route('/utxo')
def start_scan():
    query = request.args.get('q')
    #query = "bc1q50sxvr2pvpntkuuaz5wun6qqzdec47gvjvhcdx"
    job_id = str(uuid.uuid4())
    now = datetime.now()
    current_time = now.strftime("%H:%M:%S")
    utxo_store[job_id] = {'id' : job_id, 'status': 'processing', 'time': current_time}
    threading.Thread(target=run_utxo_scan, args=(job_id, [query])).start()
    return jsonify({'job_id': job_id})

@app.route('/check-scan/<job_id>')
def check_scan(job_id):
    if job_id not in utxo_store:
        return jsonify({'status': 'not_found'}), 404
    result = utxo_store[job_id]
    return jsonify(result)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)

