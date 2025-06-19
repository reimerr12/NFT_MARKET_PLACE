import {useState,useEffect,useCallback,createContext,useContext} from "react";
import { ethers } from "ethers";
import { NFT_MARKETPLACE_ADDRESS,NFT_MARKETPLACE_ABI } from "../utils/marketplaceContract";

export const Web3Context = createContext({
    //connection state
    account:null,
    provider:null,
    signer:null,
    chainId:null,
    isConnected: false,
    isConnecting: false,
    balance : '0',

    // Contract state
    contract: null,
    contractOwner: null,
    isOwner: false,

    //functions
    connectWallet : async () => {},
    disconnectWallet : () => {},
    getContractOwner : ()=>{},

    //utilities
    formatAddress: () => '',
    formatBalance: () => '',
    getBalance: async() => {},
    updateBalance: async() => {},
    isMetaMaskInstalled: () => false,
});

const SEPOLIA_NETWORK = {
  chainId: 11155111,
  name: 'Sepolia Testnet',
  rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
  blockExplorer: 'https://sepolia.etherscan.io',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 }
};


export const Web3Provider = ({children}) =>{
    const[account,setAccount] = useState(null);
    const[provider,setProvider] = useState(null);
    const[signer,setSigner] = useState(null);
    const[chainId,setChainId] = useState(null);
    const[isConnected,setIsConnected] = useState(false);
    const[isConnectiong,setIsConnecting] = useState(false);
    const[balance,setBalance] = useState('0');
    const [contractOwner, setContractOwner] = useState(null);
    const [contract, setContract] = useState(null);

    const contractAddress = NFT_MARKETPLACE_ADDRESS;
    const contractABI = NFT_MARKETPLACE_ABI;

    //is metamask installed
    const isMetaMaskInstalled = useCallback(()=>{
        return typeof window !== 'undefined' && window.ethereum && window.ethereum.isMetaMask;
    },[]);

    //format addresss
    const formatAddress = useCallback((address)=>{
        if(!address) return ' ';
        return `${address.slice(0,6)}...${address.slice(-4)}`;
    },[]);

    //format balance for display
    const formatBalanceForDisplay = useCallback((balanceWei,decimals=4)=>{
        if(!balanceWei) return ' ';
        try {
            parseFloat(ethers.utils.formatEther(balanceWei)).toFixed(decimals);
        } catch (error) {
            console.error("error formating balance",error);
            return '0';
        }
    },[]);
    
    //get balance
    const getBalance = useCallback(async(address = account)=>{
        if(!provider || !address) return 'please give a valid provider or address';
        try {
            const balance = await provider.getBalance(address);
            return balance.toString();
        } catch (error) {
            console.error("there was an error in getting the balance",error);
            return '0'
        }
    },[provider,account]);

    const getContractOwner = useCallback(async()=>{
        if(!provider || !contractAddress ||!contractABI) return 'cound not get the owner';

        try {
            const marketplaceContract = new ethers.Contract(contractAddress, contractABI, provider);
            const owner = await marketplaceContract.owner();
            setContractOwner(owner);
            setContract(marketplaceContract);
            console.log('Contract owner:', owner);
            } catch (error) {
                console.error('Error getting contract owner:', error);

                try {
                    const marketplaceContract = new ethers.Contract(contractAddress, contractABI, provider);
                    const owner = await marketplaceContract.getOwner();
                    setContractOwner(owner);
                    setContract(marketplaceContract);
                    console.log('Contract owner (via getOwner):', owner);
                } catch (secondError) {
                    console.error('Error getting contract owner with getOwner:', secondError);
                }
            }
        }, [provider, contractAddress, contractABI]);


    //update balance
    const updateBalance = useCallback(async()=>{
        if(account && provider){
            try {
                const newBalance = await provider.getBalance(account);
                setBalance(newBalance);
            } catch (error) {
                console.error('error updating balance',error);
            }
        }
    },[account,provider,getBalance]);

    //connect wallet
    const connectWallet = useCallback(async ()=>{
        if(!isMetaMaskInstalled){
            throw new Error("please install metamask");
        }

        try {

            setIsConnecting(true);

            //req account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if(accounts.length === 0){
                throw new Error("no account found");
            }

            //create provider and signer
            const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
            const web3Signer = web3Provider.getSigner();
            const network = await web3Provider.getNetwork();

            setAccount(account[0]);
            setProvider(web3Provider);
            setSigner(web3Signer);
            setChainId(network.chainId);
            setIsConnected(true);

            console.log('wallet connected',{
                account:account[0],
                chainId:network.chainId,
                networkName:network.name,
            });

        } catch (error) {
            console.error("error connection wallet",error);
            throw error;
        }finally{
            setIsConnecting(false);
        }
    },[isMetaMaskInstalled]);

    //disconnect wallet
    const disconnectWallet = useCallback(()=>{
        setAccount(null);
        setProvider(null);
        setSigner(null);
        setChainId(null);
        setIsConnected(false);
        setBalance('0');

        console.log('wallet has been disconnected');

    },[]);

    //handle accounts changed
    const handleAccountsChanged = useCallback((accounts)=>{
        if(accounts.length === 0){
            disconnectWallet();
        }else if(accounts[0] !== account){
            setAccount(accounts[0]);
            console.log("account has been changed to",accounts[0]);
        }
    },[account , disconnectWallet]);

    //handle chains changed
    const handleChainChanged = useCallback((chainId) => {
        const newChainId = parseInt(chainId, 16);
        setChainId(newChainId);
        console.log('Chain changed to:', newChainId);
        
        // Reload the page to reset state properly
        window.location.reload();
    }, []);

    //useeffect of account and chain changed
    useEffect(()=>{
        if(window.ethereum){
            window.ethereum.on('accountsChanged',handleAccountsChanged);
            window.ethereum.on('chainChanged',handleChainChanged);

            return ()=>{
                window.etherem.removeListener('accountsChanged',handleAccountsChanged);
                window.etherem.removeListener('chainChanged',handleChainChanged);
            }
        }
    },[handleAccountsChanged,handleChainChanged]);

    useEffect(()=>{
        updateBalance();
    },[updateBalance]);

    //use effect for getting contract owner
    useEffect(()=>{
        if(provider && contractAddress && contractABI){
            getContractOwner();
        }
    },[provider,contractAddress,contractABI,getContractOwner]);

    //use effect for balance updates
    useEffect(()=>{
        if(isConnected && account);
        const interval = setInterval(updateBalance,30000);
        return () => clearInterval(interval);
    },isConnected,account,updateBalance);


  // Context value
  const contextValue = {
    // Connection state
    account,
    provider,
    signer,
    chainId,
    isConnected,
    isConnecting,
    balance,
    
    // Contract state
    contract,
    contractOwner,
    isOwner: account && contractOwner ? 
      account.toLowerCase() === contractOwner.toLowerCase() : false,
    
    // Network info
    sepoliaNetwork: SEPOLIA_NETWORK,
    isOnSepolia: chainId === SEPOLIA_NETWORK.chainId,
    
    // Functions
    connectWallet,
    disconnectWallet,
    getContractOwner,
    
    // Utilities
    formatAddress,
    formatBalanceForDisplay,
    formatBalance,
    getBalance,
    updateBalance,
    isMetaMaskInstalled,
  };

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = ()=>{
    const context = useContext(Web3Context);
    if(!context){
        throw new Error('please provide a valid context');
    }

    return context;
}

export const withWeb3 = (Component)=>{
    return function Web3Component(props){
        const {isConnected} = useWeb3();
        if(!isConnected){
            return null;
        }

        return <Component {...props} />
    }
}

export default Web3Provider;