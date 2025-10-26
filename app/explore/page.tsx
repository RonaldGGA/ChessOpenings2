"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, ExternalLink, Loader, ChevronDown } from 'lucide-react';
import { FaChessKing } from 'react-icons/fa';
import ScrollToTop from '../components/scrollToTop';
import { useDebounce } from '../hooks/useDebounce';

interface Opening {
  id: string;
  fen: string;
  name: string;
  eco: string;
  moves: string;
  src: string;
  scid?: string;
  isEcoRoot?: boolean;
  aliases: Array<{
    id: string;
    source: string;
    value: string;
  }>;
}

const ExplorePage = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedEco, setSelectedEco] = useState('');
  const [ecoOptions, setEcoOptions] = useState<string[]>([]);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [totalLoaded, setTotalLoaded] = useState(0);

  // Debounce para el search term (300ms de delay)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Ref para trackear si es el primer render
  const isFirstRender = useRef(true);

  // Fetch openings - SIN dependencias problemáticas
  const fetchOpenings = useCallback(async (page: number = 1, append: boolean = false, search: string = '', eco: string = '') => {
    // Cancelar si ya hay una petición en curso
    if (page === 1 && loading) return;
    if (page > 1 && loadingMore) return;

    if (page === 1) {
      setLoading(true);
      if (!append) setOpenings([]);
    } else {
      setLoadingMore(true);
    }

    try {
      console.log('Fetching:', { page, search, eco });
      
      const response = await fetch(
        `/api/openings?page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(search)}&eco=${encodeURIComponent(eco)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (append) {
        setOpenings(prev => {
          const allOpenings = [...prev, ...data.openings];
          const uniqueOpenings = Array.from(
            new Map(allOpenings.map(opening => [opening.id, opening])).values()
          );
          return uniqueOpenings;
        });
      } else {
        setOpenings(data.openings || []);
        
        if (page === 1) {
          const ecoCodes = [...new Set(data.ecoOptions)] as string[];
          setEcoOptions(ecoCodes.sort());
        }
      }

      setHasMore(data.openings.length === itemsPerPage);
      setCurrentPage(page);
      setTotalLoaded(prev => append ? prev + data.openings.length : data.openings.length);
      
    } catch (error) {
      console.error('Error fetching openings:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [itemsPerPage, loading, loadingMore]); // Dependencias seguras

  // Efecto para búsquedas y filtros - se ejecuta solo cuando los valores debounced cambian
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // Carga inicial
      fetchOpenings(1, false, '', '');
      return;
    }

    // Resetear para nueva búsqueda
    setCurrentPage(1);
    setHasMore(true);
    setTotalLoaded(0);
    
    // Hacer la búsqueda con los términos actuales
    fetchOpenings(1, false, debouncedSearchTerm, selectedEco);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, selectedEco]); // Solo estos triggers

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchOpenings(currentPage + 1, true, debouncedSearchTerm, selectedEco);
    }
  };

  const handleOpeningClick = (openingId: string) => {
    router.push(`/practice/${openingId}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedEco('');
  };

  // Manejar cambio de search term
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Manejar cambio de ECO filter
  const handleEcoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEco(e.target.value);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <FaChessKing className="h-12 w-12 text-yellow-400 mr-3" />
            <h1 className="text-4xl font-bold bg-linear-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Chess Openings Explorer
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            {totalLoaded > 0 ? `Loaded ${openings.length} openings` : 'Explore chess openings from the database'}
            {loading && ' (Searching...)'}
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by name, ECO code, moves (e.g., 'Sicilian Defense', 'B20', '1. e4 c5')"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
                {loading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader className="h-5 w-5 animate-spin text-yellow-400" />
                  </div>
                )}
              </div>
            </div>

            {/* ECO Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                value={selectedEco}
                onChange={handleEcoChange}
                className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent appearance-none"
              >
                <option value="">All ECO Codes</option>
                {ecoOptions.map(eco => (
                  <option key={eco} value={eco}>{eco}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(debouncedSearchTerm || selectedEco) && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-300">
                Searching for: 
                {debouncedSearchTerm && ` "${debouncedSearchTerm}"`}
                {selectedEco && ` in ECO ${selectedEco}`}
                {loading && '...'}
              </div>
              <button
                onClick={clearFilters}
                className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>


        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {openings.map((opening) => (
                <div
                  key={opening.id}
                  onClick={() => handleOpeningClick(opening.id)}
                  className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 hover:border-yellow-500/50 hover:shadow-2xl hover:shadow-yellow-500/10 transition-all duration-300 cursor-pointer group"
                >
                  {/* ECO Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-block px-3 py-1 bg-yellow-500 text-slate-900 text-sm font-semibold rounded-full">
                      {opening.eco}
                    </span>
                    {opening.isEcoRoot && (
                      <span className="inline-block px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30">
                        ECO Root
                      </span>
                    )}
                  </div>

                  {/* Opening Name */}
                  <h3 className="font-bold text-lg mb-2 text-white group-hover:text-yellow-400 transition-colors line-clamp-2">
                    {opening.name}
                  </h3>

                  {/* Moves */}
                  <div className="mb-3">
                    <p className="text-sm text-gray-400 mb-1">Moves:</p>
                    <p className="text-sm font-mono text-gray-300 bg-slate-700/30 rounded-lg p-2 border border-slate-600">
                      {opening.moves}
                    </p>
                  </div>

                  {/* Source */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>Source: {opening.src}</span>
                    {opening.scid && <span>SCID: {opening.scid}</span>}
                  </div>

                  {/* Aliases */}
                  {opening.aliases.length > 0 && (
                    <div className="border-t border-slate-700 pt-3">
                      <p className="text-xs text-gray-400 mb-2">Also known as:</p>
                      <div className="flex flex-wrap gap-1">
                        {opening.aliases.slice(0, 2).map(alias => (
                          <span
                            key={alias.id}
                            className="inline-block px-2 py-1 bg-slate-700/30 text-gray-300 text-xs rounded-md border border-slate-600"
                          >
                            {alias.value}
                          </span>
                        ))}
                        {opening.aliases.length > 2 && (
                          <span className="inline-block px-2 py-1 bg-slate-700/30 text-gray-400 text-xs rounded-md">
                            +{opening.aliases.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* View Details CTA */}
                  <div className="flex items-center justify-end mt-4 pt-3 border-t border-slate-700">
                    <span className="text-yellow-400 text-sm font-medium group-hover:underline flex items-center">
                      View Details
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && openings.length > 0 && (
              <div className="flex justify-center mb-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-8 py-4 bg-yellow-500 text-slate-900 font-semibold rounded-xl hover:bg-yellow-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg hover:shadow-xl hover:shadow-yellow-500/25 border-2 border-yellow-500 hover:border-yellow-400"
                >
                  {loadingMore ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      Loading more openings...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-5 w-5" />
                      Load More ({openings.length}+)
                    </>
                  )}
                </button>
              </div>
            )}
            


            {/* No More Results */}
            {!hasMore && openings.length > 0 && (
              <div className="text-center py-8">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                  <p className="text-gray-400 text-lg">
                    🎉 All {openings.length} openings loaded!
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    You&apos;ve reached the end of the results
                  </p>
                </div>
              </div>
            )}
          </>
        )}
        

        {/* No Results */}
        {!loading && openings.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-12 border border-slate-700">
              <FaChessKing className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-400 mb-2">
                No openings found
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {searchTerm || selectedEco 
                  ? "Try adjusting your search terms or filters to find what you're looking for."
                  : "No openings available in the database."
                }
              </p>
              {(searchTerm || selectedEco) && (
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-yellow-500 text-slate-900 font-semibold rounded-xl hover:bg-yellow-400 transition-colors"
                >
                  Clear Search & Filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <ScrollToTop/>
    </div>
  );
};

export default ExplorePage;