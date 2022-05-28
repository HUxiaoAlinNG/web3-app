import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';

import { contractABI, contractAddress } from '../utils/constants';
import { TransactionContextType, TransactionType } from './types';
import detectEthereumProvider from '@metamask/detect-provider';
interface IProps {
  children: React.ReactNode;
}

export const TransactionContext = React.createContext({} as TransactionContextType);

const { ethereum } = window as any;
let provider: any;

const createEthereumContract = async (address?: string) => {
  try {
    const provider = new ethers.providers.Web3Provider(ethereum);
    if (address) {
      const exist = await provider.getCode(address);
      if (!exist) {
        throw new Error('The code does not exist on-chain');
      }
    }
    await provider.send('eth_requestAccounts', []);
    const signer = provider.getSigner();
    const transactionsContract = new ethers.Contract(contractAddress, contractABI, signer);

    return transactionsContract;
  } catch (error) {
    console.error('=====createEthereumContract error=====', error);
  }
};

const TransactionsProvider: React.FC<IProps> = (props: IProps) => {
  const { children } = props;
  const [formData, setFormData] = useState({
    addressTo: '',
    amount: '',
    keyword: '',
    message: '',
  });
  const [currentAccount, setCurrentAccount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transactionCount, setTransactionCount] = useState(
    localStorage.getItem('transactionCount'),
  );
  const [transactions, setTransactions] = useState<TransactionType[]>([]);

  const handleChange = (e, name) => {
    setFormData((prevState) => ({ ...prevState, [name]: e.target.value }));
  };

  const getAllTransactions = async (address?: string) => {
    const transactionsContract = await createEthereumContract(address);

    try {
      // call Transactions.sol getAllTransactions
      const availableTransactions = await transactionsContract.getAllTransactions();

      const structuredTransactions = availableTransactions.map((transaction) => ({
        addressTo: transaction.receiver,
        addressFrom: transaction.sender,
        timestamp: new Date(transaction.timestamp.toNumber() * 1000).toLocaleString(),
        message: transaction.message,
        keyword: transaction.keyword,
        amount: parseInt(transaction.amount._hex, 10) / 10 ** 18,
      }));

      console.log('=====structuredTransactions=====', structuredTransactions);

      setTransactions(structuredTransactions || []);
    } catch (error) {
      console.log('=====getAllTransactions error=====', error);
    }
  };

  const reloadWhenChainIdChanged = () => {
    ethereum.on('chainChanged', (chainId) => window.location.reload());
  };

  const checkIfMetaMaskInstall = async () => {
    if (!ethereum) return alert('Please install MetaMask.');
    if (!provider) {
      provider = await detectEthereumProvider();
    }
    if (provider !== ethereum) {
      alert('Do you have multiple wallets installed?');
    }
    reloadWhenChainIdChanged();
  };

  const checkIfWalletIsConnect = async () => {
    try {
      // get account address
      let accounts = await ethereum.request({ method: 'eth_accounts' });
      if (accounts.length) {
        setCurrentAccount(accounts[0]);
        await getAllTransactions(accounts[0]);
        return;
      }
      alert('Click "Connect Wallet" to connect MetaMask!');
    } catch (error) {
      console.log('=====checkIfWalletIsConnect error=====', error);
    }
  };

  const checkIfTransactionsExists = async () => {
    const transactionsContract = await createEthereumContract();
    try {
      // call Transactions.sol getTransactionCount
      const currentTransactionCount = await transactionsContract.getTransactionCount();

      console.log('=====transactionCount=====', currentTransactionCount.toNumber());
      window.localStorage.setItem('transactionCount', currentTransactionCount);
    } catch (error) {
      console.log('=====checkIfTransactionsExists error=====', error);

      throw new Error(`checkIfTransactionsExists error:${error.message}`);
    }
  };

  const connectWallet = async (): Promise<string> => {
    try {
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      setCurrentAccount(accounts[0]);
      return accounts[0];
    } catch (error) {
      console.log('=====connectWallet error=====', error);
      alert(`connect wallet error:${error.message}`);
    }
  };

  const sendTransaction = async () => {
    try {
      const { addressTo, amount, keyword, message } = formData;
      const transactionsContract = await createEthereumContract();
      const parsedAmount = ethers.utils.parseEther(amount);
      await ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: currentAccount,
            to: addressTo,
            gas: '0x5208',
            value: parsedAmount._hex,
          },
        ],
      });
      // call Transactions.sol addToBlockchain
      const transactionHash = await transactionsContract.addToBlockchain(
        addressTo,
        parsedAmount,
        message,
        keyword,
      );

      setIsLoading(true);
      console.log(`Loading - ${transactionHash.hash}`);
      await transactionHash.wait();
      console.log(`Success - ${transactionHash.hash}`);
      setIsLoading(false);

      const transactionsCount = await transactionsContract.getTransactionCount();

      setTransactionCount(transactionsCount.toNumber());
      window.location.reload();
    } catch (error) {
      console.log('====sendTransaction error====', error);

      alert(`sendTransaction error:${error.message}`);
    }
  };

  // see https://docs.metamask.io/guide/ethereum-provider.html#using-the-provider
  const init = async () => {
    await checkIfMetaMaskInstall();
    await checkIfWalletIsConnect();
    await checkIfTransactionsExists();
  };

  useEffect(() => {
    init();
  }, [transactionCount]);

  return (
    <TransactionContext.Provider
      value={{
        transactionCount,
        connectWallet,
        transactions,
        currentAccount,
        isLoading,
        sendTransaction,
        handleChange,
        formData,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

export default TransactionsProvider;
