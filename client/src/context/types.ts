export interface TransactionContextType {
  transactionCount: string;
  connectWallet: () => void;
  transactions: TransactionType[];
  currentAccount: string;
  isLoading: boolean;
  sendTransaction: () => void;
  handleChange: (e: Event, name: string) => void;
  formData: FormData;
}

export interface FormData {
  addressTo: string;
  amount: string;
  keyword: string;
  message: string;
}

export interface TransactionType {
  addressTo: string;
  addressFrom: string;
  timestamp: string;
  message: string;
  keyword: string;
  amount: number;
}