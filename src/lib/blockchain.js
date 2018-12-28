import {INSIGHT_API_URL} from '../constants';

const get = async (endpoint, opts) => {
  const response = await fetch(`${INSIGHT_API_URL}${endpoint}`, opts);

  const responseText = await response.text();

  try {
    return JSON.parse(responseText);
  } catch (err) {
    throw new Error(responseText);
  }
};

const getAddress = address => get(`addr/${address}/?noTxList=1`);

const getUtxos = addresses => {
  const body = JSON.stringify({addrs: addresses.join(',')});
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('Content-Length', body.length);

  return get(`addrs/utxo`, {
    method: 'POST',
    body,
    headers
  });
};

const getTransaction = txid => get(`tx/${txid}`);

const getRawTransaction = txid => get(`rawtx/${txid}`);

const getBestBlockHash = () => get('status?q=getBestBlockHash');

const getBlock = blockHash => get(`block/${blockHash}`);

const getTipTime = async () => {
  const {bestblockhash} = await getBestBlockHash();
  const block = await getBlock(bestblockhash);

  return block.time;
}

const broadcast = transaction => {
  const body = JSON.stringify({rawtx: transaction});
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('Content-Length', body.length);

  return get('tx/send', {
    method: 'POST',
    body,
    headers
  });
};

const blockchain = {
  get,
  getAddress,
  getUtxos,
  getTransaction,
  getRawTransaction,
  getBestBlockHash,
  getBlock,
  getTipTime,
  broadcast
};

export default blockchain;
