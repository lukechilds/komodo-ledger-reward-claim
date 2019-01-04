import React from 'react';
import {toBitcoin} from 'satoshi-bitcoin';
import ActionListModal from './ActionListModal';
import ledger from './lib/ledger';
import blockchain from './lib/blockchain';
import getAddress from './lib/get-address';
import updateActionState from './lib/update-action-state';
import {SERVICE_FEE_PERCENT, SERVICE_FEE_ADDRESS} from './constants';

class ClaimRewardsButton extends React.Component {
  state = this.initialState;

  get initialState() {
    return {
      isClaimingRewards: false,
      error: false,
      actions: {
        connect: {
          icon: 'fab fa-usb',
          description: <div>Connect and unlock your Ledger, then open the Komodo app on your device.</div>,
          state: null
        },
        confirmAddress: {
          icon: 'fas fa-search-dollar',
          description: <div>Confirm the address on your device matches the new unused address shown above.</div>,
          state: null
        },
        approveTransaction: {
          icon: 'fas fa-key',
          description: <div>Approve the transaction on your device after carefully checking the values and addresses match those shown above.</div>,
          state: null
        },
        broadcastTransaction: {
          icon: 'fas fa-broadcast-tower',
          description: <div>Broadcasting the reward claim transaction to the network.</div>,
          state: null
        }
      }
    };
  }

  resetState = () => this.setState(this.initialState);

  getUnusedAddressIndex = () => this.props.account.addresses.filter(address => !address.isChange).length;

  getUnusedAddress = () => getAddress(this.props.account.externalNode.derive(this.getUnusedAddressIndex()).publicKey);

  getOutputs = () => {
    const {
      balance,
      claimableAmount,
      serviceFee,
    } = this.props.account;

    const outputs = [
      {address: this.getUnusedAddress(), value: (balance + claimableAmount)}
    ];

    if (serviceFee > 0) {
      outputs.push({address: SERVICE_FEE_ADDRESS, value: serviceFee})
    }

    return outputs;
  };

  claimRewards = async () => {
    this.setState(prevState => ({
      ...this.initialState,
      isClaimingRewards: true,
    }));

    const {
      accountIndex,
      utxos,
    } = this.props.account;

    updateActionState(this, 'connect', 'loading');

    const ledgerIsAvailable = await ledger.isAvailable();
    if (!ledgerIsAvailable) {
      updateActionState(this, 'connect', false);
      this.setState({error: 'Ledger device is unavailable!'});
      return;
    }

    updateActionState(this, 'connect', true);
    updateActionState(this, 'confirmAddress', 'loading');

    const unusedAddress = this.getUnusedAddress();

    try {
      const derivationPath = `44'/141'/${accountIndex}'/0/${this.getUnusedAddressIndex()}`;
      const verify = true;
      const ledgerUnusedAddress = await ledger.getAddress(derivationPath, verify);
      if(ledgerUnusedAddress !== unusedAddress) {
        throw new Error(`Ledger derived address "${ledgerUnusedAddress}" doesn't match browser derived address "${unusedAddress}"`);
      }
    } catch (error) {
      updateActionState(this, 'confirmAddress', false);
      this.setState({error: error.message});
      return;
    }

    updateActionState(this, 'confirmAddress', true);
    updateActionState(this, 'approveTransaction', 'loading');

    const outputs = this.getOutputs();

    let rewardClaimTransaction;
    try {
      rewardClaimTransaction = await ledger.createTransaction(utxos, outputs);
    } catch (error) {
      updateActionState(this, 'approveTransaction', false);
      this.setState({error: error.message});
      return;
    }

    updateActionState(this, 'approveTransaction', true);
    updateActionState(this, 'broadcastTransaction', 'loading');

    try {
      const result = await blockchain.broadcast(rewardClaimTransaction);

      // this.props.handleRewardClaim();
    } catch (error) {
      updateActionState(this, 'broadcastTransaction', false);
      this.setState({error: error.message});
      return;
    }

    updateActionState(this, 'broadcastTransaction', true);

    this.setState({...this.initialState});
  };

  render() {
    const {isClaimingRewards, actions, error} = this.state;
    const isClaimableAmount = (this.props.account.claimableAmount > 0);
    const [userOutput, feeOutput] = this.getOutputs();

    return (
      <>
        <button className="button is-primary" disabled={!isClaimableAmount} onClick={this.claimRewards}>
          {this.props.children}
        </button>
        <ActionListModal
          title="Claiming Rewards"
          actions={actions}
          error={error}
          handleClose={this.resetState}
          show={isClaimingRewards}>
          <p>
            You should receive a total of {toBitcoin(userOutput.value)} KMD to a new unused address: <strong>{userOutput.address}</strong><br />
            {feeOutput ? (
              <>There will also be a {SERVICE_FEE_PERCENT}% service fee of {toBitcoin(feeOutput.value)} KMD to: <strong>{feeOutput.address}</strong></>
            ) : null}
          </p>
        </ActionListModal>
      </>
    );
  }
}

export default ClaimRewardsButton;
