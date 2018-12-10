import React from 'react';
import {hot} from 'react-hot-loader';
import ledger from './lib/ledger';
import accountDiscovery from './lib/account-discovery';
import blockchain from './lib/blockchain';
import Account from './Account';
import './App.css';

class App extends React.Component {
  state = this.initialState;

  get initialState() {
    return {
      status: null,
      utxos: [],
      tiptime: null,
      isCheckingRewards: false
    };
  }

  scanAddresses = async () => {
    this.setState({
      ...this.initialState,
      isCheckingRewards: true,
      status: 'Checking Ledger is available...'
    });

    const ledgerIsAvailable = await ledger.isAvailable();
    if (!ledgerIsAvailable) {
      this.setState({
        isCheckingRewards: false,
        status: 'Error: Ledger device is unavailable!'
      });
      return;
    }

    this.setState({status: 'Scanning blockchain for funds...'});
    try {
      const utxos = await accountDiscovery();
      const tiptime = await blockchain.getTipTime();

      this.setState({
        isCheckingRewards: false,
        status: 'Scan complete!',
        utxos,
        tiptime
      });
    } catch (error) {
      this.setState({
        isCheckingRewards: false,
        status: `Error: ${error.message}`
      });
    }
  };

  render() {
    const {isCheckingRewards, utxos, tiptime, status} = this.state;
    const accounts = [...new Set(utxos.map(utxo => utxo.account))].sort((a, b) => a - b);

    return (
      <div className="App container">
        <section className="hero">
          <div className="hero-body">
            <div className="container">
              <h1 className="title">
                Connect your Ledger and open the Komodo app on your device.
              </h1>
              <h2 className="subtitle">
                <div className="wrapper">
                  <button className={`button is-primary is-large ${isCheckingRewards && 'is-loading'}`} onClick={this.scanAddresses}>
                    Check Rewards
                  </button>
                  <span className="status">{status && status}</span>
                </div>
              </h2>
            </div>
          </div>
        </section>
        <div className="columns is-multiline">
          {accounts.map(account => (
            <Account
              key={account}
              account={account}
              tiptime={tiptime}
              utxos={utxos.filter(utxo => utxo.account === account)}
              />
          ))}
        </div>
      </div>
    );
  }
}

export default hot(module)(App);
