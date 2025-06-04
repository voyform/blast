document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const resultsDiv = document.getElementById('results');
    const defaultPlaceholderText = '<p class="placeholder-text">Enter a search term above to explore.</p>';
    const backButton = document.getElementById('backButton');
    const walletsButton = document.getElementById('walletsButton');
    const blocksButton = document.getElementById('blocksButton');
    const searchButton = document.getElementById('searchButton');
    const utxosButton = document.getElementById('utxosButton');
    const placeholder = resultsDiv.querySelector('.placeholder-text');
    const savedUtxosResults = document.getElementById('saved-utxos');

    let resultsCache = [];
    let utxoCache = [];
    let mode = 'blocks';

    // Add event listener for form submission
    searchForm.addEventListener('submit', (event) => {
        // Prevent the default form submission behavior (which reloads the page)
        event.preventDefault();
        // Get the search term from the input field and remove leading/trailing whitespace
        const searchTerm = searchInput.value.trim();
        // Clear previous results and show loading indicator
        resultsDiv.innerHTML = '<p class="loading-message">Searching...</p>'; // Provide user feedback
        // Basic validation: Check if the search term is not empty
        if (searchTerm === '') {
            resultsDiv.innerHTML = '<p class="error-message">Please enter a search term (Block Height, Tx Hash, Address).</p>';
            return; // Stop further execution if input is empty
        }
        if (mode == 'blocks') {
            console.log(`User searched for: ${searchTerm}`); 
            fetchBitcoinData(searchTerm);
            return
        }
        else if (mode == 'wallets') {
            console.log(`User requested UTXO scan of wallet: ${searchTerm}`);
            fetchUtxoScan(searchTerm)
                .then(id => {
                    console.log("Received id: ", id);
                    return checkScanStatus(id); // ✅ Returns the polling promise
                })
                .then(data => {
                    console.log("Scan completed, data:", data);
                    displayUtxoResults(data); // ✅ Safe to use now
                })
                .catch(err => {
                    console.error("Error during UTXO scan process:", err);
                });
        }
    });

    // Event listeners for wallets and blocks buttons
    walletsButton.addEventListener('click', () => {
        utxosButton.style.display = 'block';
        searchButton.style.backgroundColor = '#28A745';
        placeholder.textContent = "Search wallets.";
        mode = 'wallets';
    });

    blocksButton.addEventListener('click', () => {
        utxosButton.style.display = 'none';
        searchButton.style.backgroundColor = '#4a90e2';
        placeholder.textContent = "Search block height, hash or transaction id.";
        savedUtxosResults.style.display = 'none';
        mode = 'blocks';
    });

    // Event listener for utxosButton
    utxosButton.addEventListener('click', () => {
        console.log("UTXO Cache: ", utxoCache);
        if (savedUtxosResults.style.display !== 'block') {
            savedUtxosResults.style.display = 'block'} 
        else if (savedUtxosResults.style.display == 'block') {
            savedUtxosResults.style.display = 'none';
            return;
        };
        savedUtxosResults.innerHTML = '';
        // utxoCache.forEach((scan, index) => {
        //     const address = scan.unspents[0]?.desc.match(/addr\((.*?)\)/)?.[1] || 'Unknown Address';
        //     const amount = scan.total_amount || '0.00000000';
    
        //     const entry = document.createElement('div');
        //     entry.innerText = `${index + 1}: ${address} — ${amount} BTC`;
        //     savedUtxosResults.appendChild(entry);
        // });
        // console.log("UTXO Cache: ", utxoCache);

        utxoCache.forEach((data, index) => {
            const scan = data.result;
            const address = scan.unspents[0]?.desc.match(/addr\((.*?)\)/)?.[1] || 'Unknown Address';
            const amount = scan.total_amount || '0.00000000';
        
            const entry = document.createElement('div');
            entry.innerText = `${index + 1}: ${address} | ${amount} BTC`;
            entry.style.cursor = 'pointer';
            entry.style.marginBottom = '8px';
            entry.setAttribute('data-index', index);
        
            // Attach click listener to load this scan
            entry.addEventListener('click', () => {
                displayUtxoResults(data); // Call your main display function
                savedUtxosResults.style.display = 'none'; // Optionally hide the dropdown
            });
        
            savedUtxosResults.appendChild(entry);
        });
    })

    // --- Function to Fetch Data ---
    function fetchBitcoinData(term) {
        console.log(`Fetching data.`);
        fetch(`/search?q=${term}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("API Response:", data);
            
            console.log("Pushed to cache: ", data)
            console.log("Cache: ", resultsCache)
            resultsCache.push(data);
            if (resultsCache.length > 5) {
                resultsCache.shift();
            }
            displayResults(data); // Function to format and show results
        })
        .catch(error => {
            console.error("API Fetch Error:", error);
            displayError(`Failed to fetch data for "${term}". Please try again.`);
        });
    }
    // --- Function to Display Results ---
    function displayResults(result) {
        setupBackButton()
        console.log("Cache content: ", resultsCache);
        // BLOCK 
        if ('tx' in result && 'height' in result) {
            block = result
            const date = new Date(block.time * 1000).toLocaleString();
            const mediantime = new Date(block.mediantime * 1000).toLocaleString();
            let transactionsHTML = '<ul id="transactions-list" style="display: none;">';
            let i = 1
            block.tx.forEach(tx => {
                transactionsHTML += `
                    <li><strong>${i}. </strong><u><a href="#" class="input-link" data-txid="${tx}" style="text-decoration: none; color:rgb(2, 2, 2);">${tx}</a></u></li>
                `;
                i ++;
            });
            transactionsHTML += '</ul>';
            resultsDiv.innerHTML = `
                <div class="block-details" style="font-family: sans-serif; line-height: 1.6;">
                    <h2>Block #${block.height}</h2>
                    <hr>
                    <p><strong>Hash:</strong> <code>${block.hash}</code></p>
                    <p><strong>Time:</strong><br>${date} (Unix: ${block.time})</p>
                    <br>
                    <p><strong>Previous Block:</strong> <u><code><a href="#" class="input-link" data-txid="${block.previousblockhash || '—'}" style="text-decoration: none; color:rgb(2, 2, 2);">${block.previousblockhash || '—'}</a></code></u></p>
                    <p><strong>Next Block:</strong> <u><code><a href="#" class="input-link" data-txid="${block.nextblockhash || '—'}" style="text-decoration: none; color:rgb(2, 2, 2);">${block.nextblockhash || '—'}</a></code></u></p>
                    <br>
                    <p>Mediantime: ${mediantime}</p>
                    <p>Confirmations: ${block.confirmations}</p>
                    <p>Difficulty: ${block.difficulty}</p>
                    <p>Bits: ${block.bits}</p>
                    <p>Nonce: ${block.nonce}</p>
                    <p>Chainwork: <code>${block.chainwork}</code></p>
                    <p>Size: ${block.size} bytes</p>
                    <p>Stripped Size: ${block.strippedsize} bytes</p>
                    <p>Weight: ${block.weight}</p>
                    <p>Version: ${block.version} (<code>${block.versionHex}</code>)</p>
                    <br>
                    <p><strong>Transactions: ${block.nTx}</strong></p>
                    <p><button id="toggle-transactions" class="toggle-button">Show Transactions</button></p>
                    ${transactionsHTML}
                </div>
            `
            document.getElementById('toggle-transactions').addEventListener('click', () => {
                const transactionsList = document.getElementById('transactions-list');
                const button = document.getElementById('toggle-transactions');
        
                if (transactionsList.style.display === 'none') {
                    transactionsList.style.display = 'block';
                    button.textContent = 'Hide Transactions';
                } else {
                    transactionsList.style.display = 'none';
                    button.textContent = 'Show Transactions';
                }
            });
        }
        // TRANSACTION
        else if ('txid' in result && 'vin' in result) {
            tx = result
            let totalValue = 0;
            tx.vout.forEach(output => {
                totalValue += parseFloat(output.value);  // Ensure it's treated as a number
            });

            // INPUTS
            let inputsHTML = '<ul>';
            if ('blast_inputs' in tx && Array.isArray(tx.blast_inputs)) {
                tx.blast_inputs.forEach(input => {
                    const value = input.value;
                    const address = input.address || 'Unknown address';
                    const  txid = input.txid
                    inputsHTML += `<li><strong>${value} BTC</strong> <u><a href="#" class="input-link" data-txid="${txid}" style="text-decoration: none; color:rgb(2, 2, 2);">${address}</a></u></li>`;
                });
            } else {
                inputsHTML += '<li>No inputs found</li>';
            }
            inputsHTML += '</ul>';
            
            // OUTPUTS
            let outputsHTML = '<ul>';
            tx.vout.forEach(output => {
                const value = output.value;
                const address = output.scriptPubKey.address || 'Unknown address';
                outputsHTML += `<li><strong>${value} BTC</strong> ${address}</li>`;
            });
            outputsHTML += '</ul>';

            const date = new Date(tx.time * 1000).toLocaleString();
            resultsDiv.innerHTML = `
                <div class="block-details" style="font-family: sans-serif; line-height: 1.6;">
                    <h2>Transaction details:</h2>
                    <p><strong>Hash:</strong> <code>${tx.hash}</code></p>
                    <p><strong>Time:</strong> ${date}</p>
                    <p><strong>Block Hash:</strong> <u><code><a href="#" class="input-link" data-txid="${tx.blockhash}" style="text-decoration: none; color:rgb(2, 2, 2);">${tx.blockhash}</a></code></u>
                    <p><strong>Value: ${totalValue}</strong></p>
                    <hr>
                    <p><strong>Inputs:</strong></p>
                    <p>${inputsHTML}</p>
                    <hr>
                    <p><strong>Outputs:</strong></p>
                    <p>${outputsHTML}</p>
                </div>
            `
        };
        document.querySelectorAll('.input-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const txid = e.target.dataset.txid;
                fetchBitcoinData(txid);
            });
        });
        
    }      
    // --- Function to Display Errors ---
    function displayError(message) {
        resultsDiv.innerHTML = `<p class="error-message">${message}</p>`;
    }

    function fetchUtxoScan(term) {
        console.log(`func fetchUtxoScan: Fetching utxo.`);
        return fetch(`/utxo?q=${term}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("func fetchUtxoScan: API Response:", data);
            // displayUtxoResults(data); // Function to format and show results
            console.log(data.job_id);
            return data.job_id;
        })
        .catch(error => {
            console.error("API Fetch Error:", error);
            displayError(`Failed to fetch data for "${term}". Please try again.`);
        });
    }

    function checkScanStatus(scanId, interval = 3000) {
        return new Promise((resolve, reject) => {
            const poller = setInterval(async () => {
                try {
                    const response = await fetch(`/check-scan/${scanId}`);
                    const data = await response.json();
    
                    console.log("Polling status:", data.status);
    
                    if (data.status === 'done') {
                        clearInterval(poller);
                        utxoCache.push(data);
                        resolve(data); // ✅ Resolves the promise with data
                    }
    
                    // Optionally handle other states like "error"
                    if (data.status === 'error') {
                        clearInterval(poller);
                        reject(new Error("Scan failed."));
                    }
    
                } catch (err) {
                    clearInterval(poller);
                    reject(err);
                }
            }, interval);
        });
    }
    
    function displayUtxoResults(data) {
        const result = data.result;
        const unspents = result.unspents;
        const resultsDiv = document.getElementById('results'); // Assuming you have a div with this ID
    
        let utxoHTML = '<ul id="transactions-list" style="display: none;">';
        unspents.forEach((utxo, index) => {
            utxoHTML += `
                <li>
                    <strong>${index + 1}. </strong>
                    <u><a href="#" class="input-link" data-txid="${utxo.txid}" style="text-decoration: none; color: rgb(2, 2, 2);">
                        ${utxo.txid}
                    </a></u>
                    <br><small>Amount: <code>${utxo.amount} BTC</code></small><br>
                    <small>Height: ${utxo.height}, Vout: ${utxo.vout}</small><br>
                    <small>Desc: ${utxo.desc}</small>
                </li><br>
            `;
        });
        utxoHTML += '</ul>';
    
        resultsDiv.innerHTML = `
            <div class="block-details" style="font-family: sans-serif; line-height: 1.6;">
                <h2>UTXO Scan Results</h2>
                <hr>
                <p><strong>Success:</strong> ${result.success}</p>
                <p><strong>Block Height:</strong> ${result.height}</p>
                <p><strong>Best Block:</strong> <code>${result.bestblock}</code></p>
                <p><strong>Total Amount:</strong> ${result.total_amount} BTC</p>
                <p><strong>TX Outputs Count:</strong> ${result.txouts}</p>
                <p><strong>Unspent Outputs:</strong> ${unspents.length}</p>
                <br>
                <p><button id="toggle-utxo" style="background-color: #28A745; border: none; color: white; padding: 6px 12px; text-align: center; text-decoration: none; font-size: 14px; cursor: pointer; border-radius: 5px; font-weight: bold; transition: background-color 0.3s ease;">Show UTXOs</button></p>
                ${utxoHTML}
            </div>
        `;
    
        // Toggle the UTXO list
        document.getElementById('toggle-utxo').addEventListener('click', () => {
            const list = document.getElementById('transactions-list');
            const btn = document.getElementById('toggle-transactions');
            if (list.style.display === 'none') {
                list.style.display = 'block';
                btn.textContent = 'Hide UTXOs';
            } else {
                list.style.display = 'none';
                btn.textContent = 'Show UTXOs';
            }
        });
    
        // Clickable txid links
        document.querySelectorAll('.input-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                mode = 'blocks';
                const txid = e.target.dataset.txid;
                fetchBitcoinData(txid);
            });
        });
    }
    

    // Optional: Clear results when input is cleared (if browser shows clear 'x')
    searchInput.addEventListener('input', () => {
        if (searchInput.value.trim() === '') {
            resultsDiv.innerHTML = defaultPlaceholderText; // Reset to default placeholder
        }
    });

    backButton.addEventListener('click', () => {
        console.log("Back button clicked.");
        console.log("Cache content: ", resultsCache);
        result = resultsCache[resultsCache.length - 2];
        resultsCache.pop();
        displayResults(result);
    });

    function setupBackButton() {
        if (resultsCache.length > 1) {
            backButton.style.display = 'block';
        }
        else {
            backButton.style.display = 'none';
        }
    };
}); // End of DOMContentLoaded