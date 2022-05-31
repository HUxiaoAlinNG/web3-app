import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';

import { contractABI, contractAddress } from '../utils/constants';
import { TransactionContextType, TransactionType } from './types';
import detectEthereumProvider from '@metamask/detect-provider';
import { createProvider, getProvider, getSigner } from './ethersUtils';
interface IProps {
  children: React.ReactNode;
}

export const TransactionContext = React.createContext({} as TransactionContextType);

const { ethereum } = window as any;
let provider: any;

const createEthereumContract = async (address?: string) => {
  try {
    const provider = getProvider(ethereum);
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
  const [currentAccountBalance, setCurrentAccountBalance] = useState('');

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
        amount: ethers.utils.formatEther(transaction.amount),
      }));

      setTransactions(structuredTransactions || []);
    } catch (error) {
      console.log('=====getAllTransactions error=====', error);
    }
  };

  const reloadWhenChainIdChanged = () => {
    const provider = getProvider(ethereum);
    provider.on('chainChanged', (chainId) => window.location.reload());
  };

  const checkIfMetaMaskInstall = async () => {
    if (!ethereum) return alert('Please install MetaMask.');
    if (!provider) {
      provider = await detectEthereumProvider();
    }
    if (provider !== ethereum) {
      alert('Do you have multiple wallets installed?');
    }
    createProvider(ethereum);
    reloadWhenChainIdChanged();
  };

  const checkIfWalletIsConnect = async () => {
    try {
      // get account address
      const signer = getSigner(ethereum);
      const address = await signer.getAddress();
      if (address) {
        setCurrentAccount(address);
        await getBalance(address);
        await getAllTransactions(address);
        await getTransactionCount();
        return;
      }
    } catch (error) {
      console.error(`=====checkIfWalletIsConnect error=====:${error.message}`);
      alert('Click "Connect Wallet" to connect MetaMask!');
    }
  };

  const getTransactionCount = async () => {
    const transactionsContract = await createEthereumContract();
    try {
      // call Transactions.sol getTransactionCount
      const currentTransactionCount = await transactionsContract.getTransactionCount();
      window.localStorage.setItem('transactionCount', currentTransactionCount);
    } catch (error) {
      console.error('=====getTransactionCount error=====', error);
    }
  };

  const connectWallet = async (): Promise<string> => {
    try {
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      const account = accounts[0];
      setCurrentAccount(account);
      await getBalance(account);
      await getAllTransactions(account);
      return account;
    } catch (error) {
      alert(`connect wallet error:${error.message}`);
    }
  };

  const getBalance = async (account: string): Promise<ethers.BigNumber> => {
    try {
      const provider = getProvider(ethereum);
      const balance = await provider.getBalance(account);
      setCurrentAccountBalance(ethers.utils.formatEther(balance));
      return balance;
    } catch (error) {
      console.error('=====getBalance error=====', error);
    }
  };

  const sendTransaction = async () => {
    try {
      const { addressTo, amount, keyword, message } = formData;
      const transactionsContract = await createEthereumContract();
      const parsedAmount = ethers.utils.parseEther(amount);
      const signer = getSigner(ethereum);
      await signer.sendTransaction({
        from: currentAccount,
        to: addressTo,
        gasPrice: '0x5208',
        value: parsedAmount._hex,
      });
      // call Transactions.sol addToBlockchain
      const transactionHash = await transactionsContract.addToBlockchain(
        addressTo,
        parsedAmount,
        message,
        keyword,
      );

      setIsLoading(true);
      await transactionHash.wait();
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
  };

  useEffect(() => {
    init();
  }, [transactionCount]);

  return (
    <TransactionContext.Provider
      value={{
        transactionCount,
        currentAccountBalance,
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
