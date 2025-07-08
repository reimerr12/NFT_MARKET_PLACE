import { useState } from "react";
import { X, HandCoins, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { formatEther , parseEther } from "ethers/lib/utils";
import { BigNumber } from "ethers";

const placeBidModal=({isOpen,onClose,tokenId,onPlaceBid,currentHighestBid,txLoading})=>{
    const[bidAmount,setBidAmount] = useState('');
    const[status,setStatus] = useState(null);

    useEffect(() => {
        if (!isOpen) {
        resetForm();
        }
    }, [isOpen]);

    const resetForm = ()=>{
        setBidAmount('');
        setStatus(null);
    }

    const handleClose=()=>{
        resetForm();
        onClose();
    }

    const handleSubmit=async(e)=>{
        e.preventDefault();
        setStatus('pending');
        try {
            if(!bidAmount || parseFloat(bidAmount)<=0){
                throw new Error("please enter a valid bid amount.");
            }
            const bidAmountInWei = parseEther(bidAmount);

            const currentHighestBidBigNumber = currentHighestBid ? BigNumber.from(currentHighestBid) : BigNumber.from(0);

            if(bidAmountInWei.lte(currentHighestBidBigNumber)){
                throw new Error(`Your bid must be higher than the current highest bid (${formatEther(currentHighestBidBigNumber)} ETH).`);
            }

            await onPlaceBid(tokenId,bidAmountInWei);
            setStatus('success');
            setTimeout(handleClose,2000);
        } catch (error) {
            console.error("there was an error placing a bid",error);
            setStatus('failed');
        }
    }

    if(!isOpen) return null;

    return(
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-[#202225] rounded-xl shadow-2xl w-full max-w-sm p-6 relative transform scale-95 animate-scale-in border border-[#34373B]">

                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors duration-200 rounded-full p-1 hover:bg-[#34373B]">
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-bold text-white mb-6 text-center capitalize">place bid on nft</h2>

                <form action="" onSubmit={handleSubmit} className="space-y-5">
                    <p className="text-gray-300 text-center">
                        You are placing a bid on NFT {tokenId.toString()}.
                    </p>

                    {currentHighestBid && currentHighestBid !=='0' && (
                        <p className="text-md text-gray-200 capitalize">
                            current highest bid: <span className="font-semibold text-blue-500">{parseFloat(parseEther(currentHighestBid)).toFixed(4)}</span>
                        </p>
                    )}

                    <div>
                        <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-300 mb-2">place your bid</label>

                        <input 
                        type="number" 
                        id="bidAmount"
                        value={bidAmount}
                        onChange={(e)=>setBidAmount(e.target.value)}
                        min={currentHighestBid ? parseFloat(formatEther(currentHighestBid)) + 0.005 : 0.005}
                        step='0.005'
                        className="mt-1 block px-4 py-2 border border-[#474A50] w-fit rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text white bg-bg-[#34373B] placeholder-gray-500 duration-200"
                        placeholder={`Min ${currentHighestBid ? (parseFloat(formatEther(currentHighestBid)) + 0.005).toFixed(4) : '0.005'}`}
                        required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={txLoading || status === 'pending'}
                        className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                        {txLoading || status === 'pending' ? (
                        <Loader2 className="animate-spin h-5 w-5 mr-3" />
                        ) : (
                        <HandCoins className="h-5 w-5 mr-3" />
                        )}
                        {txLoading || status === 'pending' ? 'Placing Bid...' : 'Place Bid'}
                    </button>

                    {status === 'success' && (
                        <div className="mt-4 flex items-center justify-center text-green-400">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        <span>Bid Placed Successfully!</span>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="mt-4 flex items-center justify-center text-red-500">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        <span>Bid Failed. Please try again.</span>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

export default placeBidModal;