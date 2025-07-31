import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { X, Gavel, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import Portal from './Portal';
import { parseEther } from 'ethers/lib/utils';
import { useWeb3 } from '../providers/Web3Provider';

const CreateAuctionModal=({isOpen,onClose,onCreate,tokenId,txLoading})=>{
    const [reservePrice,setReservePrice] = useState('');
    const [duration,setDuration] = useState('24');
    const [status,setStatus] = useState(null);
    const [isSubmitting,setIsSubmitting] = useState(false);

    const{isConnected,account,connectWallet,isConnecting} = useWeb3();

    const resetForm = useCallback(()=>{
        setReservePrice('');
        setDuration('24');
        setStatus(null);
        setIsSubmitting(false);
    },[]);

    const handleClose = useCallback(()=>{
      resetForm();
      onClose();
    },[resetForm,onClose]);

    useEffect(()=>{
      if(isOpen){
        resetForm();
      }
    },[isOpen,resetForm]);

    const handleReservedPriceChange = useCallback((e)=>{
      setReservePrice(e.target.value);

      if(status && status.includes('error')){
        setStatus(null);
      }
    },[status]);

    const handleDurationChange = useCallback((e)=>{
      setDuration(e.target.value);

      if(status && status.includes('error')){
        setStatus(null);
      }
    },[status]);

    //will start here tomorrow
    const handleSubmit = async (e) =>{
        e.preventDefault();
        
        const reservedPriceValue = parseFloat(reservePrice);
        const durationValue = parseInt(duration);

        if(!reservePrice || reservedPriceValue <= 0 || isNaN(reservedPriceValue)){
          setStatus('error-invalid-price');
          return;
        }

        if(!durationValue || durationValue <= 0 || isNaN(durationValue)){
          setStatus("error-invalid-duration");
          return;
        }

        if(isSubmitting || txLoading) return;

        setIsSubmitting(true);

        try {
          if(!account || !isConnected){
            setStatus("pending connection");

            await connectWallet();

            let attempts = 0;
            while((!account || !isConnected) && attempts <=10){
              await new Promise(resolve => setTimeout(resolve,300));
              attempts++;
            }

            if(!account || !isConnected){
              throw new Error("failed to connect wallet");
            }
          }

          setStatus('pending');

          const reservedPriceInWei = ethers.utils.parseEther(reservePrice);
          const durationInHours = parseInt(duration);

          await new Promise(resolve => setTimeout(resolve,300));

          await onCreate(tokenId,reservedPriceInWei,durationInHours);

          setStatus('success');

          setTimeout(()=>{
            handleClose();
          },1500);
        } catch (error) {
          console.error('there is an error in the create auction modal', error);
          setStatus('error');
        } finally {
          setIsSubmitting(false);
        }
    }

    if(!isOpen) return null;

    const isLoading = txLoading || isSubmitting || isConnecting || status === 'pending' || status === 'pending-connect';

    return (
     <Portal>
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-[#202225] rounded-xl shadow-2xl w-full max-w-md p-6 relative transform scale-95 animate-scale-in border border-[#34373B]">
            <button
              onClick={handleClose}
              type='button'
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors duration-200 rounded-full p-1 hover:bg-[#34373B]"
              disabled={isLoading}
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-6 text-center">Create Auction for NFT</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-gray-300 text-center" >Auctioning Token ID: <span className="font-semibold text-purple-400">{tokenId}</span></p>

              <div>
                <label htmlFor="reservePrice" className="block text-sm font-medium text-gray-300 mb-2">
                  Reserve Price (ETH) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="reservePrice"
                  value={reservePrice}
                  onChange={handleReservedPriceChange}
                  min="0.0001"
                  step="any"
                  className="mt-1 block w-full px-4 py-2 border border-[#474A50] rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-[#34373B] text-white placeholder-gray-400 transition-colors duration-200"
                  placeholder="e.g. 0.1"
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-300 mb-2">
                  Auction Duration (Hours) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="duration"
                  value={duration}
                  onChange={handleDurationChange}
                  min="1"
                  step="1"
                  className="mt-1 block w-full px-4 py-2 border border-[#474A50] rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 bg-[#34373B] text-white placeholder-gray-400 transition-colors duration-200"
                  placeholder="e.g. 24"
                  disabled={isLoading} 
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !reservePrice || !duration} 
                className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-500 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
               {isLoading ? (
                            <>
                              <Loader2 className="animate-spin h-5 w-5 mr-3" />
                                {status === 'pending-connect' ? 'Connecting Wallet...' : 'Creating Auction...'}
                            </>
                            ) : (
                              <>
                                  <Gavel className="h-5 w-5 mr-3" />
                                  Create Auction
                              </>
                        )}
              </button>

              {status === 'success' && (
                <div className="mt-4 flex items-center justify-center text-green-400">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>Auction Created Successfully!</span>
                </div>
              )}

              {status === 'error' && (
                <div className="mt-4 flex items-center justify-center text-red-500">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <span>Failed to create auction. Please try again.</span>
                </div>
              )}

              {status === 'error-invalid-price' && (
                <div className="mt-4 flex items-center justify-center text-red-500">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>Please enter a valid positive reserve price.</span>
                </div>
              )}

              {status === 'error-invalid-duration' && (
                <div className="mt-4 flex items-center justify-center text-red-500">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>Please enter a valid positive reserve price.</span>
                </div>
              )}

              {(!account || !isConnected) && !isLoading && (
                <div className="mt-4 flex items-center justify-center text-yellow-400">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>Wallet not connected. Please connect to create auction.</span>
                </div>
                )}
            </form>
          </div>
        </div>
     </Portal>
  );
}
export default CreateAuctionModal;