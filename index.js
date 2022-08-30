/* eslint-disable no-console */
/* eslint-disable max-len */
require('dotenv').config();

const bitcoin = require('bitcoinjs-lib');
const axios = require('axios');

async function signAndSendTransaction() {
  const fromAddress = process.env.FROM_ADDRESS;
  const toAddress = process.env.TO_ADDRESS;
  const value = process.env.VALUE;
  const privateKeyWIF = process.env.PRIVATE_KEY;
  const network = process.env.NETWORK;

  let bitcoinjs;
  let apiParam;
  
  if (network === 'mainnet') {
      bitcoinjs = 'bitcoin';
      apiParam = 'main'
  } else {
      bitcoinjs = 'testnet';
      apiParam = 'test3'
  }

  const keys = bitcoin.ECPair.fromWIF(privateKeyWIF, bitcoin.networks[bitcoinjs]);

  const data = { inputs: [ { addresses: [ fromAddress ] } ], outputs: [ { addresses: [ toAddress ], value: parseInt(value) } ] };

  const { error, response } = await postRequest({ url: `http://api.blockcypher.com/v1/btc/${apiParam}/txs/new`, data: JSON.stringify(data) });

  if (error) {
    return { error: 'Insufficient funds.' };
  }

  const tmptx = response.data;

  tmptx.pubkeys = [];

  tmptx.signatures = tmptx.tosign.map((tosign, n) => {
    tmptx.pubkeys.push(keys.publicKey.toString('hex'));
    const signature = keys.sign(Buffer.from(tosign, 'hex'));

    const encodedSignature = bitcoin.script.signature.encode(signature, bitcoin.Transaction.SIGHASH_ALL);
    const hexStr = encodedSignature.toString('hex').slice(0, -2);

    return hexStr;
  });

  const { error: err, response: resp } =  await postRequest({ url: `https://api.blockcypher.com/v1/btc/${apiParam}/txs/send`, data: JSON.stringify(tmptx) });

  if (err) {
    return { error: 'Incorrect private Key.' };
  }

  console.log('Transaction Hash : ', resp.data.tx.hash);

  return { response: resp.data.tx.hash };
}

const postRequest = async ({ url, data, headers }) => {
    try {
      const response = await axios({
        url: `${url}`,
        method: 'post',
        data,
        headers: headers || {
          'cache-control': 'no-cache',
        },
      });
  
      return { response };
    } catch (error) {
      return { error: error.response.data.errors[0].error };
    }
};

signAndSendTransaction();
