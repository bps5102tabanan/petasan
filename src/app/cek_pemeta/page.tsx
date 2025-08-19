"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type InformasiSLS = {
  id: string;
  pemeriksa: string;
  pemeta: string;
};

type InformasiSubSLS = {
  sls_id: string;
  muatan: number;
};

type AggregatedData = {
  pemeriksa: string;
  pemeta: string;
  jumlah_sls: number;
  total_muatan: number;
};

type SortConfig = {
  key: keyof AggregatedData | 'avg_muatan';
  direction: 'ascending' | 'descending';
};

export default function AggregasiPemeriksa() {
  const [aggregatedData, setAggregatedData] = useState<AggregatedData[]>([]);
  const [filteredData, setFilteredData] = useState<AggregatedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Filter states
  const [pemeriksaFilter, setPemeriksaFilter] = useState<string>("");
  const [pemetaFilter, setPemetaFilter] = useState<string>("");

  // Available filter options
  const [pemeriksaOptions, setPemeriksaOptions] = useState<string[]>([]);
  const [pemetaOptions, setPemetaOptions] = useState<string[]>([]);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'pemeriksa',
    direction: 'ascending'
  });

  // Fetch and aggregate data
  useEffect(() => {
    const fetchAndAggregate = async () => {
      setLoading(true);
      try {
        const [slsData, subSlsData] = await Promise.all([
          fetchInformasiSLS(),
          fetchInformasiSubSLS(),
        ]);

        // Create a map of SLS ID to muatan
        const muatanMap: Record<string, number> = {};
        subSlsData.forEach((sub) => {
          if (!muatanMap[sub.sls_id]) muatanMap[sub.sls_id] = 0;
          muatanMap[sub.sls_id] += sub.muatan;
        });

        // Aggregate by pemeriksa and pemeta
        const aggregation: Record<string, AggregatedData> = {};

        slsData.forEach((sls) => {
          const key = `${sls.pemeriksa}||${sls.pemeta}`;
          if (!aggregation[key]) {
            aggregation[key] = {
              pemeriksa: sls.pemeriksa,
              pemeta: sls.pemeta,
              jumlah_sls: 0,
              total_muatan: 0,
            };
          }
          aggregation[key].jumlah_sls += 1;
          aggregation[key].total_muatan += muatanMap[sls.id] || 0;
        });

        const result = Object.values(aggregation).sort((a, b) => 
          a.pemeriksa.localeCompare(b.pemeriksa) || a.pemeta.localeCompare(b.pemeta)
        );

        setAggregatedData(result);
        setFilteredData(result);

        // Set filter options
        const uniquePemeriksa = Array.from(new Set(result.map(item => item.pemeriksa)));
        const uniquePemeta = Array.from(new Set(result.map(item => item.pemeta)));

        setPemeriksaOptions(uniquePemeriksa);
        setPemetaOptions(uniquePemeta);

      } catch (e) {
        console.error("Error aggregating data:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAndAggregate();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...aggregatedData];

    // Apply filters
    if (pemeriksaFilter) {
      result = result.filter(item => item.pemeriksa === pemeriksaFilter);
    }

    if (pemetaFilter) {
      result = result.filter(item => item.pemeta === pemetaFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let valueA, valueB;

      if (sortConfig.key === 'avg_muatan') {
        valueA = a.total_muatan / a.jumlah_sls;
        valueB = b.total_muatan / b.jumlah_sls;
      } else {
        valueA = a[sortConfig.key];
        valueB = b[sortConfig.key];
      }

      if (valueA < valueB) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });

    setFilteredData(result);
    setCurrentPage(1);
  }, [pemeriksaFilter, pemetaFilter, aggregatedData, sortConfig]);

  // Sort request handler
  const requestSort = (key: keyof AggregatedData | 'avg_muatan') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Filter handlers
  const handlePemeriksaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPemeriksaFilter(e.target.value);
  };

  const handlePemetaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPemetaFilter(e.target.value);
  };

  const resetFilters = () => {
    setPemeriksaFilter("");
    setPemetaFilter("");
  };

  // Fetch functions
  const fetchInformasiSLS = async (): Promise<InformasiSLS[]> => {
    const { data, error } = await supabase
      .from("informasiSLS")
      .select("id, pemeriksa, pemeta");
    if (error) {
      console.error("Error fetch informasiSLS:", error);
      return [];
    }
    return data ?? [];
  };

  const fetchInformasiSubSLS = async (): Promise<InformasiSubSLS[]> => {
    let allRows: InformasiSubSLS[] = [];
    let from = 0;
    const size = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("informasiSubSLS")
        .select("sls_id, muatan")
        .range(from, from + size - 1);

      if (error) {
        console.error("Error fetch informasiSubSLS:", error);
        break;
      }

      if (!data || data.length === 0) break;
      allRows = allRows.concat(data as InformasiSubSLS[]);
      if (data.length < size) break;
      from += size;
    }

    return allRows;
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

  if (loading) return <div className="p-4">Loading data...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
            <ArrowLeft size={18} /> Kembali ke Halaman Utama
        </Link>
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-800">Agregasi Pemeriksa & Pemeta</h1>
          <p className="text-gray-500 text-sm">
            Data agregasi berdasarkan pemeriksa dan pemeta dengan total muatan
          </p>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Pemeriksa */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Pemeriksa</label>
              <select
                className="w-full rounded-lg border bg-gray-50 text-sm px-3 py-2"
                value={pemeriksaFilter}
                onChange={handlePemeriksaChange}
              >
                <option value="">Semua Pemeriksa</option>
                {pemeriksaOptions.map((pemeriksa, i) => (
                  <option key={i} value={pemeriksa}>{pemeriksa}</option>
                ))}
              </select>
            </div>

            {/* Pemeta */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Pemeta</label>
              <select
                className="w-full rounded-lg border bg-gray-50 text-sm px-3 py-2"
                value={pemetaFilter}
                onChange={handlePemetaChange}
              >
                <option value="">Semua Pemeta</option>
                {pemetaOptions.map((pemeta, i) => (
                  <option key={i} value={pemeta}>{pemeta}</option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full text-sm bg-gray-200 hover:bg-gray-300 rounded-lg px-3 py-2 transition"
              >
                🔄 Reset Filter
              </button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Pemeriksa</h3>
            <p className="text-2xl font-bold">
              {new Set(filteredData.map(item => item.pemeriksa)).size}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Pemeta</h3>
            <p className="text-2xl font-bold">
              {new Set(filteredData.map(item => item.pemeta)).size}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Muatan</h3>
            <p className="text-2xl font-bold">
              {filteredData.reduce((sum, item) => sum + item.total_muatan, 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto rounded-lg shadow bg-white">
          <table className="min-w-full text-sm text-left text-gray-700">
            <thead className="text-xs uppercase bg-gray-100 text-gray-600">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">
                  <button 
                    onClick={() => requestSort('pemeriksa')}
                    className={`flex items-center w-full text-left hover:text-blue-500 ${sortConfig.key === 'pemeriksa' ? 'font-bold' : ''}`}
                  >
                    Pemeriksa
                    {sortConfig.key === 'pemeriksa' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button 
                    onClick={() => requestSort('pemeta')}
                    className={`flex items-center w-full text-left hover:text-blue-500 ${sortConfig.key === 'pemeta' ? 'font-bold' : ''}`}
                  >
                    Pemeta
                    {sortConfig.key === 'pemeta' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button 
                    onClick={() => requestSort('jumlah_sls')}
                    className={`flex items-center justify-end w-full hover:text-blue-500 ${sortConfig.key === 'jumlah_sls' ? 'font-bold' : ''}`}
                  >
                    Jumlah SLS
                    {sortConfig.key === 'jumlah_sls' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button 
                    onClick={() => requestSort('total_muatan')}
                    className={`flex items-center justify-end w-full hover:text-blue-500 ${sortConfig.key === 'total_muatan' ? 'font-bold' : ''}`}
                  >
                    Total Muatan
                    {sortConfig.key === 'total_muatan' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button 
                    onClick={() => requestSort('avg_muatan')}
                    className={`flex items-center justify-end w-full hover:text-blue-500 ${sortConfig.key === 'avg_muatan' ? 'font-bold' : ''}`}
                  >
                    Rata-rata Muatan/SLS
                    {sortConfig.key === 'avg_muatan' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentRows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{(currentPage - 1) * rowsPerPage + i + 1}</td>
                  <td className="px-4 py-3">{row.pemeriksa}</td>
                  <td className="px-4 py-3">{row.pemeta}</td>
                  <td className="px-4 py-3 text-right">{row.jumlah_sls.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{row.total_muatan.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    {Math.round(row.total_muatan / row.jumlah_sls).toLocaleString()}
                  </td>
                </tr>
              ))}

              {currentRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-gray-500 italic">
                    Tidak ada data yang cocok dengan filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center text-sm text-gray-600">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
          >
            ⬅ Prev
          </button>
          <span>
            Page {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(p => p + 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
          >
            Next ➡
          </button>
        </div>
      </div>
    </div>
  );
}