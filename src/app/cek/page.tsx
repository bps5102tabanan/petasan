"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";


type InformasiSLS = {
  id: string;
  kecamatan: string;
  desa: string;
  sls: string;
  pemeriksa: string;
  pemeta: string;
  jumlah_sub: number;
  jumlah_segmen: number;
  catatan?: string;
};

type InformasiSubSLS = {
  sls_id: string;
  muatan: number;
};

type DatabaseAwal = {
  id: string;
  estimasi_sub: number;
  estimasi_muatan: number;
};

type MetabaseSLSData = {
  idsls_eform: string;
  segmen_eform: number;
  muatan_eform: number;
};

type CombinedData = {
  id: string;
  kecamatan: string;
  desa: string;
  sls: string;
  pemeriksa: string;
  pemeta: string;
  segmen_petasan?: number;
  segmen_eform?: number;
  estimasi_sub?: number;
  sub_petasan?: number;
  estimasi_muatan?: number;
  muatan_petasan?: number;
  muatan_eform?: number;
  catatan?: string;
};

export default function MetabaseTable() {
  const [combinedData, setCombinedData] = useState<CombinedData[]>([]);
  const [filteredData, setFilteredData] = useState<CombinedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Filter states
  const [kecamatanFilter, setKecamatanFilter] = useState<string>("");
  const [desaFilter, setDesaFilter] = useState<string>("");
  const [pemeriksaFilter, setPemeriksaFilter] = useState<string>("");
  const [pemetaFilter, setPemetaFilter] = useState<string>("");

  // Available filter options
  const [kecamatanOptions, setKecamatanOptions] = useState<string[]>([]);
  const [desaOptions, setDesaOptions] = useState<string[]>([]);
  const [pemeriksaOptions, setPemeriksaOptions] = useState<string[]>([]);
  const [pemetaOptions, setPemetaOptions] = useState<string[]>([]);

  const normalizeId = (id: unknown): string => {
    return String(id).trim().replace(/[^0-9]/g, "");
  };

  // Fetch all data
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [slsData, subSlsGrouped, dbAwalMap, metabaseData] = await Promise.all([
          fetchInformasiSLS(),
          fetchInformasiSubSLS(),
          fetchDatabaseAwal(),
          fetchMetabaseData(),
        ]);

        const combined = slsData.map((sls) => {
          const normId = normalizeId(sls.id);
          const metabaseMatch = metabaseData.find((m) => normalizeId(m.idsls_eform) === normId);
          const dbAwal = dbAwalMap[sls.id];

          return {
            id: sls.id,
            kecamatan: sls.kecamatan,
            desa: sls.desa,
            sls: sls.sls,
            pemeriksa: sls.pemeriksa,
            pemeta: sls.pemeta,
            segmen_petasan: sls.jumlah_segmen,
            segmen_eform: metabaseMatch?.segmen_eform,
            estimasi_sub: dbAwal?.estimasi_sub,
            sub_petasan: sls.jumlah_sub,
            estimasi_muatan: dbAwal?.estimasi_muatan,
            muatan_petasan: subSlsGrouped[sls.id] ?? 0,
            muatan_eform: metabaseMatch?.muatan_eform,
            catatan: sls.catatan || "",
          };
        });

        const sorted = combined.sort((a, b) => Number(a.id) - Number(b.id));
        setCombinedData(sorted);
        setFilteredData(sorted);

        // Set filter options
        const uniqueKecamatan = Array.from(new Set(sorted.map(item => item.kecamatan)));
        const uniqueDesa = Array.from(new Set(sorted.map(item => item.desa)));
        const uniquePemeriksa = Array.from(new Set(sorted.map(item => item.pemeriksa)));
        const uniquePemeta = Array.from(new Set(sorted.map(item => item.pemeta)));

        setKecamatanOptions(uniqueKecamatan);
        setDesaOptions(uniqueDesa);
        setPemeriksaOptions(uniquePemeriksa);
        setPemetaOptions(uniquePemeta);

      } catch (e) {
        console.error("fetchAll error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  // Apply filters whenever filter values change
  useEffect(() => {
    let result = [...combinedData];

    if (kecamatanFilter) {
      result = result.filter(item => item.kecamatan === kecamatanFilter);
    }

    if (desaFilter) {
      result = result.filter(item => item.desa === desaFilter);
    }

    if (pemeriksaFilter) {
      result = result.filter(item => item.pemeriksa === pemeriksaFilter);
    }

    if (pemetaFilter) {
      result = result.filter(item => item.pemeta === pemetaFilter);
    }

    setFilteredData(result);
    setCurrentPage(1);
  }, [kecamatanFilter, desaFilter, pemeriksaFilter, pemetaFilter, combinedData]);

  // Independent filter handler functions
  const handleKecamatanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setKecamatanFilter(e.target.value);
  };

  const handleDesaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDesaFilter(e.target.value);
  };

  const handlePemeriksaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPemeriksaFilter(e.target.value);
  };

  const handlePemetaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPemetaFilter(e.target.value);
  };

  const resetFilters = () => {
    setKecamatanFilter("");
    setDesaFilter("");
    setPemeriksaFilter("");
    setPemetaFilter("");
  };

  // Get filtered options for dropdowns
  const getFilteredDesaOptions = () => {
    let filtered = combinedData;
    if (kecamatanFilter) {
      filtered = filtered.filter(item => item.kecamatan === kecamatanFilter);
    }
    return Array.from(new Set(filtered.map(item => item.desa)));
  };

  const getFilteredPemeriksaOptions = () => {
    let filtered = combinedData;
    if (kecamatanFilter) filtered = filtered.filter(item => item.kecamatan === kecamatanFilter);
    if (desaFilter) filtered = filtered.filter(item => item.desa === desaFilter);
    return Array.from(new Set(filtered.map(item => item.pemeriksa)));
  };

  const getFilteredPemetaOptions = () => {
    let filtered = combinedData;
    if (kecamatanFilter) filtered = filtered.filter(item => item.kecamatan === kecamatanFilter);
    if (desaFilter) filtered = filtered.filter(item => item.desa === desaFilter);
    if (pemeriksaFilter) filtered = filtered.filter(item => item.pemeriksa === pemeriksaFilter);
    return Array.from(new Set(filtered.map(item => item.pemeta)));
  };

  // Fetch functions
  const fetchInformasiSLS = async (): Promise<InformasiSLS[]> => {
    const { data, error } = await supabase
      .from("informasiSLS")
      .select("id, kecamatan, desa, sls, pemeriksa, pemeta, jumlah_sub, jumlah_segmen, catatan");
    if (error) {
      console.error("Error fetch informasiSLS:", error);
      return [];
    }
    return data ?? [];
  };

  const fetchInformasiSubSLS = async (): Promise<Record<string, number>> => {
    let from = 0;
    const size = 1000;
    let allRows: InformasiSubSLS[] = [];

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

    const grouped: Record<string, number> = {};
    allRows.forEach((row) => {
      if (!grouped[row.sls_id]) grouped[row.sls_id] = 0;
      grouped[row.sls_id] += row.muatan;
    });

    return grouped;
  };

  const fetchDatabaseAwal = async (): Promise<Record<string, DatabaseAwal>> => {
    const { data, error } = await supabase
      .from("databaseAwal")
      .select("id, estimasi_sub, estimasi_muatan");
    if (error) {
      console.error("Error fetch databaseAwal:", error);
      return {};
    }
    const map: Record<string, DatabaseAwal> = {};
    (data ?? []).forEach((row) => {
      map[row.id] = row;
    });
    return map;
  };

  const fetchMetabaseData = async (): Promise<MetabaseSLSData[]> => {
    try {
      const response = await axios.get("/api/metabase_muatan");
      const rows: unknown[][] = response.data.data.rows;

      return rows
        .filter((row) => String(row[2]) === "sls" && String(row[5]) === "5102")
        .map((row) => ({
          idsls_eform: normalizeId(row[1]),
          segmen_eform: Number(row[11]),
          muatan_eform: Number(row[12]),
        }));
    } catch (error) {
      console.error("fetchMetabaseData error:", error);
      return [];
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Cell styling functions
  const getSegmenCellStyle = (segmen_petasan?: number, segmen_eform?: number) => {
    if (segmen_petasan === undefined || segmen_eform === undefined) return {};
    return segmen_petasan !== segmen_eform 
      ? { backgroundColor: '#f87171', color: 'white' } 
      : {};
  };

  const getSubPetasanCellStyle = (sub_petasan?: number, estimasi_sub?: number) => {
    if (sub_petasan === undefined || estimasi_sub === undefined) return {};
    return sub_petasan < estimasi_sub 
      ? { backgroundColor: '#f87171', color: 'white' } 
      : {};
  };

  const getEstimasiMuatanCellStyle = (estimasi_muatan?: number, muatan_eform?: number) => {
    if (estimasi_muatan === undefined || muatan_eform === undefined) return {};
    return estimasi_muatan > muatan_eform 
      ? { backgroundColor: '#f87171', color: 'white' } 
      : {};
  };

  const getMuatanCellStyle = (muatan_petasan?: number, muatan_eform?: number) => {
    if (muatan_petasan === undefined || muatan_eform === undefined) return {};
    return muatan_petasan !== muatan_eform 
      ? { backgroundColor: '#f87171', color: 'white' } 
      : {};
  };

  if (loading) return <div className="p-4">Loading data...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
            <ArrowLeft size={18} /> Kembali ke Halaman Utama
          </Link>
        </div>
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-800">Gabungan Data SLS</h1>
          <p className="text-gray-500 text-sm">Gunakan filter di bawah untuk mempersempit data.</p>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Kecamatan */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Kecamatan</label>
              <select
                className="w-full rounded-lg border bg-gray-50 text-sm px-3 py-2"
                value={kecamatanFilter}
                onChange={handleKecamatanChange}
              >
                <option value="">Semua Kecamatan</option>
                {kecamatanOptions.map((kecamatan, i) => (
                  <option key={i} value={kecamatan}>{kecamatan}</option>
                ))}
              </select>
            </div>

            {/* Desa */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Desa</label>
              <select
                className="w-full rounded-lg border bg-gray-50 text-sm px-3 py-2"
                value={desaFilter}
                onChange={handleDesaChange}
              >
                <option value="">Semua Desa</option>
                {getFilteredDesaOptions().map((desa, i) => (
                  <option key={i} value={desa}>{desa}</option>
                ))}
              </select>
            </div>

            {/* Pemeriksa */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Pemeriksa</label>
              <select
                className="w-full rounded-lg border bg-gray-50 text-sm px-3 py-2"
                value={pemeriksaFilter}
                onChange={handlePemeriksaChange}
              >
                <option value="">Semua Pemeriksa</option>
                {getFilteredPemeriksaOptions().map((pemeriksa, i) => (
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
                {getFilteredPemetaOptions().map((pemeta, i) => (
                  <option key={i} value={pemeta}>{pemeta}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-right">
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:underline"
            >
              🔄 Reset Filter
            </button>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto rounded-lg shadow bg-white">
          <table className="min-w-full text-sm text-left text-gray-700">
            <thead className="text-xs uppercase bg-gray-100 text-gray-600">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Kecamatan</th>
                <th className="px-4 py-3">Desa</th>
                <th className="px-4 py-3">SLS</th>
                <th className="px-4 py-3">Pemeriksa</th>
                <th className="px-4 py-3">Pemeta</th>
                <th className="px-4 py-3">Segmen Petasan</th>
                <th className="px-4 py-3">Segmen Eform</th>
                <th className="px-4 py-3">Estimasi Sub</th>
                <th className="px-4 py-3">Sub Petasan</th>
                <th className="px-4 py-3">Estimasi Muatan</th>
                <th className="px-4 py-3">Muatan Petasan</th>
                <th className="px-4 py-3">Muatan Eform</th>
                <th className="px-4 py-3">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentRows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{row.id}</td>
                  <td className="px-4 py-3">{row.kecamatan}</td>
                  <td className="px-4 py-3">{row.desa}</td>
                  <td className="px-4 py-3">{row.sls}</td>
                  <td className="px-4 py-3">{row.pemeriksa}</td>
                  <td className="px-4 py-3">{row.pemeta}</td>
                  
                  {/* Segmen cells with conditional styling */}
                  <td 
                    className="px-4 py-3" 
                    style={getSegmenCellStyle(row.segmen_petasan, row.segmen_eform)}
                  >
                    {row.segmen_petasan ?? "-"}
                  </td>
                  <td 
                    className="px-4 py-3" 
                    style={getSegmenCellStyle(row.segmen_petasan, row.segmen_eform)}
                  >
                    {row.segmen_eform ?? "-"}
                  </td>
                  
                  <td className="px-4 py-3">{row.estimasi_sub ?? "-"}</td>
                  
                  {/* Sub Petasan with conditional styling */}
                  <td 
                    className="px-4 py-3" 
                    style={getSubPetasanCellStyle(row.sub_petasan, row.estimasi_sub)}
                  >
                    {row.sub_petasan ?? "-"}
                  </td>
                  
                  {/* Estimasi Muatan with conditional styling */}
                  <td 
                    className="px-4 py-3" 
                    style={getEstimasiMuatanCellStyle(row.estimasi_muatan, row.muatan_eform)}
                  >
                    {row.estimasi_muatan ?? "-"}
                  </td>
                  
                  {/* Muatan cells with conditional styling */}
                  <td 
                    className="px-4 py-3" 
                    style={getMuatanCellStyle(row.muatan_petasan, row.muatan_eform)}
                  >
                    {row.muatan_petasan ?? "-"}
                  </td>
                  <td 
                    className="px-4 py-3" 
                    style={getMuatanCellStyle(row.muatan_petasan, row.muatan_eform)}
                  >
                    {row.muatan_eform ?? "-"}
                  </td>
                  <td className="px-4 py-3">{row.catatan}</td>
                </tr>
              ))}

              {currentRows.length === 0 && (
                <tr>
                  <td colSpan={13} className="text-center py-4 text-gray-500 italic">
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
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            ⬅ Prev
          </button>
          <span>
            Page {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(p => p + 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Next ➡
          </button>
        </div>
      </div>
    </div>
  );
}