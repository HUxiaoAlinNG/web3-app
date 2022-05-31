import { ethers } from 'ethers';

let etherProvider: ethers.providers.Web3Provider;

export const getProvider = (ethereum: any): ethers.providers.Web3Provider => {
  if (!etherProvider) {
    createProvider(ethereum);
  }
  return etherProvider;
};
export const createProvider = (ethereum: any) => {
  etherProvider = new ethers.providers.Web3Provider(ethereum);
};

export const getSigner = (ethereum: any): ethers.providers.JsonRpcSigner => {
  const provider = getProvider(ethereum);
  return provider.getSigner();
}