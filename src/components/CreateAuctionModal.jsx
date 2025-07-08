import { useState } from 'react';
import { X, Gavel, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { parseEther } from 'ethers/lib/utils';

const CreateAuctionModal=({isOpen,onClose,onCreate,tokenId,txLoading})=>{
    const [reservePrice,setReservePrice] = useState('');
    const [duration,setDuration] = useState('24');
    const [status,setStatus] = useState(null);

    const resetForm = ()=>{
        setReservePrice('');
        setDuration('24');
        setStatus(null);
    };

    const handleClose = ()=>{
        resetForm();
        onClose();
    }

    const handleSubmit = async (e) =>{
        e.preventDefault();
        setStatus('pending');
        try {
            if(!reservePrice || parseInt(reservePrice) <= 0 || !duration || parseInt(duration)<=0){
                throw new Error("please enter a valid reserved price and a duration");
            }

            const reservedPriceInWei = parseEther(reservePrice);
            const durationInHours = parseInt(duration);
            await onCreate(tokenId,reservedPriceInWei,durationInHours);
            setStatus('success');
            setTimeout(handleClose,2000);
        } catch (error) {
            console.error('there is and error in the create auction modal',error);
            setStatus('error');
        }
    }

    if(!isOpen) return null;

    return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[#202225] rounded-xl shadow-2xl w-full max-w-md p-6 relative transform scale-95 animate-scale-in border border-[#34373B]">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors duration-200 rounded-full p-1 hover:bg-[#34373B]"
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
              onChange={(e) => setReservePrice(e.target.value)}
              min="0.0001"
              step="any"
              className="mt-1 block w-full px-4 py-2 border border-[#474A50] rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-[#34373B] text-white placeholder-gray-400 transition-colors duration-200"
              placeholder="e.g. 0.1"
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
              onChange={(e) => setDuration(e.target.value)}
              min="1"
              step="1"
              className="mt-1 block w-full px-4 py-2 border border-[#474A50] rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 bg-[#34373B] text-white placeholder-gray-400 transition-colors duration-200"
              placeholder="e.g. 24"
              required
            />
          </div>

          <button
            type="submit"
            disabled={txLoading || status === 'pending'}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-500 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {txLoading || status === 'pending' ? (
              <Loader2 className="animate-spin h-5 w-5 mr-3" />
            ) : (
              <Gavel className="h-5 w-5 mr-3" />
            )}
            {txLoading || status === 'pending' ? 'Creating Auction...' : 'Create Auction'}
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
        </form>
      </div>
    </div>
  );
}
export default CreateAuctionModal;