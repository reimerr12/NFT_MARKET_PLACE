import { useState } from "react";
import { X, Tag, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { parseEther } from "ethers/lib/utils";

const ListForSaleModal = ({isOpen,onClose,onList,tokenId,txLoading}) => {
    const[price,setPrice] = useState('');
    const[status,setStatus] = useState(null);

    const resetForm = () =>{
        setPrice('');
        setStatus(null);
    }

    const handleClose = () =>{
        resetForm();
        onClose();
    }

    const handleSubmit = async(e)=>{
        e.preventDefault();
        setStatus('pending');
        try {
            if(!price || parseFloat(price) <= 0){
                throw new Error('please enter a valid price please');
            }
            const priceInWei = parseEther(price);
            await onList(tokenId,priceInWei);
            setTimeout(handleClose,2000);
        } catch (error) {
            console.error("there is an error on the handlesubmit of list modal",error);
            setStatus(error);
        }
    };

    if(!isOpen) return null;

    return(
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-[#202225] rounded-xl shadow-xl w-full max-w-sm p-6 relative transform scale-95 animate-scale-in border border-[#34373B]">

                <button onClick={()=>{handleClose}} className="absolute top-4 right-4 text-blue-500 hover:text-gray-200 transition-colors duration-150 rounded-full p-1 hover:bg-[#34373B]">
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-bold mb-6 text-center text-white capitalize">list nft for sale</h2>

                <form action="" onSubmit={handleSubmit} className="space-y-5 capitalize">
                    <p className="text-white text-center">
                       you are listing NFT {tokenId.toString()}
                    </p>

                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-2">
                            Price (ETH) <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="number" 
                            id='price'
                            value={price}
                            onChange={(e)=>setPrice(e.target.value)}
                            min='0.0001'
                            className="mt-1 block w-full px-4 py-2 border border-[#474A50] rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-[#34373B] text-white placeholder-gray-400 transition-colors duration-200"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={txLoading || status === 'pending'}
                        className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                        {txLoading || status === 'pending' ? (
                        <Loader2 className="animate-spin h-5 w-5 mr-3" />
                        ) : (
                        <Tag className="h-5 w-5 mr-3" />
                        )}
                        {txLoading || status === 'pending' ? 'Listing NFT...' : 'Confirm Listing'}
                    </button>

                    {status === 'success' && (
                        <div className="mt-4 flex items-center justify-center text-green-400">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        <span>NFT Listed Successfully!</span>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="mt-4 flex items-center justify-center text-red-500">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        <span>Listing Failed. Please try again.</span>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );

};

export default ListForSaleModal;