import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play,  
  Users,  
  Star, 
  ArrowRight, 
  Zap, 
  Shield, 
  Award, 
  Eye, 
  Heart, 
  Sparkles,
  ChevronRight,
  Activity,
  Layers,
  Crown,
  Code,
  Lock,
} from 'lucide-react';
import { SiEthereum } from 'react-icons/si';
import { BigNumber } from "ethers";
import { formatEther } from "ethers/lib/utils";
import { useWeb3 } from "../providers/Web3Provider";
import useNFT from "../providers/NFTProvider";
import MosaicNFTCard from "../components/MosaicNFTCard";

const HomePage = () => {
  const navigate = useNavigate();
  const { isConnected } = useWeb3();
  const {
    getActiveListings,
    getActiveAuctions,
    getNftInfo,
    getNFTMetadata,
  } = useNFT();

  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [trendingNFTs, setTrendingNFTs] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [totalNFTCount, setTotalNFTCount] = useState(0);
  const [totalVolume, setTotalVolume] = useState('0');

  // Load trending NFTs from marketplace
  const loadTrendingNFTs = useCallback(async () => {
    if (!isConnected) return;
    
    setDataLoading(true);
    try {
      const [activeListings, activeAuctions] = await Promise.all([
        getActiveListings(),
        getActiveAuctions(),
      ]);

      const allMarketplaceTokenIds = [...new Set([...activeListings, ...activeAuctions])];
      setTotalNFTCount(allMarketplaceTokenIds.length);

      // Take first 6 NFTs for trending section
      const trendingTokenIds = allMarketplaceTokenIds.slice(0, 6);
      
      const trendingWithMetadata = await Promise.all(
        trendingTokenIds.map(async (tokenId, index) => {
          try {
            const [metadata, info] = await Promise.all([
              getNFTMetadata(tokenId),
              getNftInfo(tokenId)
            ]);

            // Process info to ensure BigNumber compatibility
            const processedInfo = { ...info };
            
            if (processedInfo.price !== undefined && processedInfo.price !== null) {
              try {
                if (!BigNumber.isBigNumber(processedInfo.price)) {
                  processedInfo.price = BigNumber.from(processedInfo.price.toString());
                }
              } catch (error) {
                processedInfo.price = BigNumber.from(0);
              }
            } else {
              processedInfo.price = BigNumber.from(0);
            }

            if (processedInfo.highestBid !== undefined && processedInfo.highestBid !== null) {
              try {
                if (!BigNumber.isBigNumber(processedInfo.highestBid)) {
                  processedInfo.highestBid = BigNumber.from(processedInfo.highestBid.toString());
                }
              } catch (error) {
                processedInfo.highestBid = BigNumber.from(0);
              }
            } else {
              processedInfo.highestBid = BigNumber.from(0);
            }

            // Assign mosaic size patterns
            const patterns = ['tall', 'medium', 'featured', 'large', 'tall', 'medium'];
            const size = patterns[index % patterns.length];

            return { 
              tokenId, 
              metadata, 
              info: processedInfo,
              mosaicSize: size,
              trending: index < 3
            };
          } catch (error) {
            console.error(`Error loading NFT ${tokenId}:`, error);
            return null;
          }
        })
      );

      const validNFTs = trendingWithMetadata.filter(Boolean);
      setTrendingNFTs(validNFTs);

      // Calculate total volume from loaded NFTs
      const volume = validNFTs.reduce((acc, nft) => {
        if (nft.info?.price && nft.info?.isListed) {
          try {
            const priceInEth = parseFloat(formatEther(nft.info.price));
            return acc + priceInEth;
          } catch (error) {
            return acc;
          }
        }
        return acc;
      }, 0);
      
      setTotalVolume(volume.toFixed(2));

    } catch (error) {
      console.error('Error loading trending NFTs:', error);
    } finally {
      setDataLoading(false);
    }
  }, [isConnected, getActiveListings, getActiveAuctions, getNFTMetadata, getNftInfo]);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadTrendingNFTs();
  }, [loadTrendingNFTs]);

  const features = [
    { icon: Shield, title: 'Secure Trading', description: 'Military-grade security for all transactions' },
    { icon: Zap, title: 'Lightning Fast', description: 'Instant minting and trading on Ethereum' },
    { icon: Award, title: 'Premium Quality', description: 'Curated collection of high-value NFTs' },
    { icon: Users, title: 'Global Community', description: 'Join thousands of creators worldwide' }
  ];

  // Navigation handlers
  const handleStartCreating = () => {
    navigate('/dashboard');
  };

  const handleExploreMarket = () => {
    navigate('/marketplace');
  };

  const handleViewAll = () => {
    navigate('/marketplace');
  };

  const handleNFTClick = (tokenId) => {
    navigate('/marketplace');
  };

  const stats = [
    { value: `${totalNFTCount}+`, label: 'NFTs Available', icon: Sparkles },
    { value: '12K+', label: 'Active Traders', icon: Users },
    { value: `${totalVolume} ETH`, label: 'Total Volume', icon: SiEthereum },
    { value: '98%', label: 'Satisfaction', icon: Star }
  ];

  return (
    <div className="min-h-screen bg-[#202225] text-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-gray-600/20 to-cyan-500/20"></div>
          <div className="absolute inset-0">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute bg-blue-400/10 rounded-full animate-pulse"
                style={{
                  width: Math.random() * 100 + 20,
                  height: Math.random() * 100 + 20,
                  left: Math.random() * 100 + '%',
                  top: Math.random() * 100 + '%',
                  animationDelay: Math.random() * 4 + 's',
                  animationDuration: Math.random() * 6 + 3 + 's'
                }}
              ></div>
            ))}
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className={`transition-all duration-1500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full px-6 py-2 mb-8">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span className="text-blue-300 font-medium">Next-Gen NFT Marketplace</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-200 to-cyan-300 bg-clip-text text-transparent leading-tight">
              Discover, Create &
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-gray-400 bg-clip-text">Trade NFTs</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl sm:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              The ultimate marketplace for digital art, collectibles, and unique blockchain assets. 
              Create, collect, and trade with confidence.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <button 
                onClick={handleStartCreating}
                className="group relative overflow-hidden bg-blue-500 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-500 ease-out shadow-xl hover:shadow-2xl hover:scale-105 transform"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center space-x-3">
                  <Sparkles className="w-6 h-6" />
                  <span>Start Creating</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </button>

              <button 
                onClick={handleExploreMarket}
                className="group flex items-center space-x-3 bg-[#34373B] border-2 border-gray-600 hover:border-blue-500 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-500 ease-out hover:bg-[#2c2f33] hover:scale-105 transform"
              >
                <Play className="w-6 h-6 text-blue-400" />
                <span>Explore Market</span>
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className={`grid grid-cols-2 lg:grid-cols-4 gap-8 transition-all duration-1500 delay-500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {stats.map((stat, index) => (
              <div key={index} className="bg-[#34373B]/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-500 ease-out hover:scale-105 transform">
                <div className="flex items-center justify-center mb-3">
                  <stat.icon className="w-8 h-8 text-blue-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-gray-400 text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-b from-[#202225] to-[#2c2f33]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 to-gray-400 bg-clip-text text-transparent">
                Why Choose Our Platform
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Built for creators, collectors, and traders who demand the best experience in the NFT space.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Feature Cards */}
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`group cursor-pointer transition-all duration-700 ease-out ${
                    activeFeature === index 
                      ? 'bg-gradient-to-r from-blue-500/20 to-gray-500/20 border-blue-500/50' 
                      : 'bg-[#34373B]/50 border-gray-600/50 hover:border-blue-500/30'
                  } border rounded-2xl p-6`}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-xl transition-all duration-500 ${
                      activeFeature === index 
                        ? 'bg-blue-500/30 text-blue-300' 
                        : 'bg-gray-700 text-gray-400 group-hover:bg-blue-500/20 group-hover:text-blue-400'
                    }`}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                      <p className="text-gray-300">{feature.description}</p>
                    </div>
                    <ChevronRight className={`w-5 h-5 transition-all duration-500 ${
                      activeFeature === index ? 'text-blue-400 translate-x-1' : 'text-gray-500'
                    }`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Interactive Demo */}
            <div className="relative">
              <div className="bg-gradient-to-br from-[#34373B] to-[#2c2f33] rounded-3xl p-8 border border-gray-600/50 shadow-2xl">
                <div className="bg-gradient-to-r from-blue-500/10 to-gray-500/10 rounded-2xl p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-gray-500 rounded-xl flex items-center justify-center">
                        <Crown className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white">Premium Collection</h4>
                        <p className="text-gray-400 text-sm">Digital Art Series</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-green-400">
                      <Activity className="w-4 h-4" />
                      <span className="text-sm font-medium">Live</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="aspect-square bg-gradient-to-br from-blue-400/20 to-gray-400/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                        <Layers className="w-6 h-6 text-blue-400" />
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <SiEthereum className="w-5 h-5 text-blue-400" />
                      <span className="font-bold text-white">2.5 ETH</span>
                    </div>
                    <div className="flex space-x-2">
                      <button className="p-2 bg-gray-700/50 rounded-lg hover:bg-blue-500/20 transition-colors duration-300">
                        <Heart className="w-4 h-4 text-gray-400 hover:text-red-400" />
                      </button>
                      <button className="p-2 bg-gray-700/50 rounded-lg hover:bg-blue-500/20 transition-colors duration-300">
                        <Eye className="w-4 h-4 text-gray-400 hover:text-blue-400" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <span className="text-green-400 font-medium">Transaction Confirmed</span>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                    <span className="text-blue-400 font-medium">Smart Contract Verified</span>
                    <Lock className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </section>

      {/* Trending Section */}
      <section className="py-24 bg-[#202225]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold mb-4">
                <span className="bg-gradient-to-r from-blue-600 to-gray-400 bg-clip-text text-transparent">
                  Trending Now
                </span>
              </h2>
              <p className="text-gray-300 text-lg">Discover the hottest NFTs in the market</p>
            </div>
            <button 
              onClick={handleViewAll}
              className="flex items-center space-x-2 bg-[#34373B] border border-gray-600 hover:border-blue-500 px-6 py-3 rounded-xl font-semibold transition-all duration-500 ease-out hover:bg-[#2c2f33] hover:scale-105 transform"
            >
              <span>View All</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {dataLoading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-[#34373B] rounded-3xl p-6 border border-gray-600/50 animate-pulse">
                  <div className="aspect-square bg-gray-700 rounded-2xl mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                    <div className="flex justify-between">
                      <div className="h-3 bg-gray-700 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : trendingNFTs.length > 0 ? (
              // Masonry-style grid using MosaicNFTCard
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6 col-span-full">
                {trendingNFTs.map((nft) => (
                  <div key={nft.tokenId} className="break-inside-avoid mb-6 relative cursor-pointer" onClick={() => handleNFTClick(nft.tokenId)}>
                    <div className="transform transition-all duration-500 ease-out hover:scale-105 hover:shadow-2xl">
                      <MosaicNFTCard
                        nft={nft}
                        showActions={false}
                        size={nft.mosaicSize}
                        isClickable={true}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Empty state
              <div className="col-span-full text-center py-12 text-gray-400">
                <div className="w-16 h-16 mx-auto mb-4 opacity-50">
                  <Layers className="w-full h-full" />
                </div>
                <p className="text-xl font-semibold mb-2">No NFTs Available</p>
                <p className="text-gray-400">
                  {!isConnected 
                    ? 'Connect your wallet to see marketplace NFTs'
                    : 'No active listings or auctions found in the marketplace'
                  }
                </p>
                {!isConnected && (
                  <button 
                    onClick={handleExploreMarket}
                    className="mt-4 flex items-center space-x-2 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6 py-3 rounded-xl font-bold transition-all duration-500 ease-out shadow-lg hover:shadow-xl hover:scale-105 transform"
                  >
                    <Play className="w-5 h-5" />
                    <span>Explore Market</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-[#2c2f33] to-[#202225]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-r from-blue-500/10 to-gray-500/10 border border-blue-500/30 rounded-3xl p-12">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Ready to Start Your
              <br />
              <span className="bg-gradient-to-r from-blue-500 to-gray-300 bg-clip-text text-transparent">
                NFT Journey?
              </span>
            </h2>
            
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of creators and collectors in the most advanced NFT marketplace. 
              Create, trade, and discover unique digital assets.
            </p>
            
            <div className="flex justify-center">
              <button className="flex items-center justify-center space-x-3 bg-transparent border-2 border-gray-600 hover:border-blue-500 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-500 ease-out hover:bg-blue-500/10 hover:scale-105 transform">
                <Code className="w-6 h-6" />
                <span>View Docs</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;