"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Pencil } from "lucide-react";
import ModalView from "@/components/ModalView";
import ModalEdit, { InformasiSLS, SegmenRow } from "@/components/ModalEdit";
import { supabase } from "@/lib/supabaseClient";

// ✅ Warna badge status
const getStatusColor = (status: string) => {
  switch (status) {
    case "Belum":
      return "bg-red-100 text-red-700";
    case "Proses":
      return "bg-yellow-100 text-yellow-700";
    case "Submit":
      return "bg-blue-100 text-blue-700";
    case "Approve":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

// ✅ Format tanggal untuk tampilan
const formatDate = (dateString?: string | null) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function FormPage() {
  const [data, setData] = useState<InformasiSLS[]>([]);
  const [filtered, setFiltered] = useState<InformasiSLS[]>([]);

  const [filterKecamatan, setFilterKecamatan] = useState("");
  const [filterDesa, setFilterDesa] = useState("");
  const [filterPemeta, setFilterPemeta] = useState("");
  const [filterPengawas, setFilterPengawas] = useState("");

  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const [selectedRow, setSelectedRow] = useState<InformasiSLS | null>(null);
  const [editRow, setEditRow] = useState<InformasiSLS | null>(null);

  // ✅ Ambil data utama dari Supabase
  /*
  const fetchData = async () => {
    const { data, error } = await supabase
      .from("informasiSLS")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("❌ Gagal ambil data:", error.message);
      return;
    }

    setData(data as InformasiSLS[]);
    setFiltered(data as InformasiSLS[]);
  };
  */

  const fetchData = async () => {
    const { data: informasiData, error: infoError } = await supabase
      .from("informasiSLS")
      .select("*")
      .order("id", { ascending: true });

    const { data: linksData, error: linksError } = await supabase
      .from("sls_links")
      .select("idsls, link");

    if (infoError || linksError) {
      console.error("❌ Gagal ambil data:");
      if (infoError) console.error("InformasiSLS:", infoError.message);
      if (linksError) console.error("SLS Links:", linksError.message);
      return;
    }

    // Gabungkan data secara manual berdasarkan id
    const withLink = informasiData.map((item) => {
      const linkObj = linksData.find((link) => link.idsls === item.id);
      return {
        ...item,
        link: linkObj?.link ?? null,
      };
    });

    setData(withLink);
    setFiltered(withLink);
  };

  // ✅ Pertama kali ambil data
  useEffect(() => {
    fetchData();
  }, []);

  // ✅ Filtering data
  const filteredData = useMemo(() => {
    let f = [...data];
    if (filterKecamatan) f = f.filter((r) => r.kecamatan === filterKecamatan);
    if (filterDesa) f = f.filter((r) => r.desa === filterDesa);
    if (filterPemeta) f = f.filter((r) => r.pemeta === filterPemeta);
    if (filterPengawas) f = f.filter((r) => r.pemeriksa === filterPengawas);
    return f;
  }, [data, filterKecamatan, filterDesa, filterPemeta, filterPengawas]);

  // ✅ List filter dropdown
  const kecamatanList = useMemo(() => [...new Set(filteredData.map((d) => d.kecamatan))], [filteredData]);
  const desaList = useMemo(() => [...new Set(filteredData.map((d) => d.desa))], [filteredData]);
  const pemetaList = useMemo(() => [...new Set(filteredData.map((d) => d.pemeta))], [filteredData]);
  const pengawasList = useMemo(() => [...new Set(filteredData.map((d) => d.pemeriksa))], [filteredData]);

  useEffect(() => {
    setFiltered(filteredData);
    setPage(1);
  }, [filteredData]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const resetFilter = () => {
    setFilterKecamatan("");
    setFilterDesa("");
    setFilterPemeta("");
    setFilterPengawas("");
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleSaveEdit = async (updated: InformasiSLS, segmenList: SegmenRow[]) => {
    try {
      // ✅ 1. Update informasi utama
      const { error: updateError } = await supabase
        .from("informasiSLS")
        .update({
          status: updated.status,
          jumlah_sub: updated.jumlah_sub,
          jumlah_segmen: updated.jumlah_segmen,
          tgl_awal: updated.tgl_awal,
          tgl_akhir: updated.tgl_akhir,
          catatan: updated.catatan,
          perubahan: updated.perubahan,
          memperbesar: updated.memperbesar,
          memperkecil: updated.memperkecil,
          menerima: updated.menerima,
          cetak: updated.cetak
        })
        .eq("id", updated.id);

      if (updateError) throw updateError;

      // ✅ Debug: cek dulu apa yang ada di DB sebelum delete
      const { data: beforeDelete, error: beforeErr } = await supabase
        .from("informasiSubSLS")
        .select("sls_id, segmen_no")
        .eq("sls_id", updated.id);

      console.log("🔍 Row yang akan dihapus:", beforeDelete);
      if (beforeErr) console.error("❌ Gagal cek sebelum delete:", beforeErr);


      // ✅ 2. Hapus semua segmen lama
      const { error: deleteError } = await supabase
        .from("informasiSubSLS")
        .delete()
        .eq("sls_id", updated.id);

      if (deleteError) throw deleteError;

      console.log("✅ Semua segmen lama sudah dihapus untuk", updated.id);

      if (deleteError) throw deleteError;
      console.log(`✅ Semua segmen lama sudah dihapus untuk ${updated.id}`);

      // ✅ 3. Tunggu 200ms supaya delete benar-benar commit
      await sleep(200);

      // ✅ 4. Siapkan segmen baru
      const newSegmen = segmenList.map((seg, idx) => ({
        sls_id: updated.id,
        segmen_no: idx + 1,
        sub: seg.sub,
        muatan: seg.muatan,
      }));

      // ✅ 5. Insert ulang semua segmen
      if (newSegmen.length > 0) {
        const { error: insertError } = await supabase
          .from("informasiSubSLS")
          .insert(newSegmen);

        if (insertError) throw insertError;
      }

      alert("✅ Data berhasil disimpan!");
      fetchData();
      setEditRow(null);

    } catch (error: unknown) {
      console.error("❌ Gagal simpan:", error);
      if (typeof error === "object" && error !== null && "code" in error) {
        alert(
          (error as { code: string }).code === "23505"
            ? "❗ Gagal: Ada data segmen yang duplikat."
            : "Terjadi kesalahan saat menyimpan data."
        );
      } else {
        alert("Terjadi kesalahan saat menyimpan data.");
      }
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Kembali */}
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
            <ArrowLeft size={18} /> Kembali ke Halaman Utama
          </Link>
        </div>

        {/* Judul */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-800">📋 Form Informasi SLS</h1>
          <p className="text-gray-500 text-sm">Gunakan filter di bawah untuk mempersempit data.</p>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Kecamatan */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Kecamatan</label>
              <select
                className="w-full rounded-lg border bg-gray-50 text-sm px-3 py-2"
                value={filterKecamatan}
                onChange={(e) => setFilterKecamatan(e.target.value)}
              >
                <option value="">Semua</option>
                {kecamatanList.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>

            {/* Desa */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Desa</label>
              <select
                className="w-full rounded-lg border bg-gray-50 text-sm px-3 py-2"
                value={filterDesa}
                onChange={(e) => setFilterDesa(e.target.value)}
              >
                <option value="">Semua</option>
                {desaList.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Pemeriksa */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Pemeriksa</label>
              <select
                className="w-full rounded-lg border bg-gray-50 text-sm px-3 py-2"
                value={filterPengawas}
                onChange={(e) => setFilterPengawas(e.target.value)}
              >
                <option value="">Semua</option>
                {pengawasList.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Pemeta */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Pemeta</label>
              <select
                className="w-full rounded-lg border bg-gray-50 text-sm px-3 py-2"
                value={filterPemeta}
                onChange={(e) => setFilterPemeta(e.target.value)}
              >
                <option value="">Semua</option>
                {pemetaList.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-right">
            <button
              onClick={resetFilter}
              className="text-sm text-blue-600 hover:underline"
            >
              🔄 Reset Filter
            </button>
          </div>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto rounded-lg shadow bg-white">
          <table className="min-w-full text-sm text-left text-gray-700">
            <thead className="text-xs uppercase bg-gray-100 text-gray-600">
              <tr>
                <th className="px-4 py-3">Kecamatan</th>
                <th className="px-4 py-3">Desa</th>
                <th className="px-4 py-3">SLS</th>
                <th className="px-4 py-3">Pemeriksa</th>
                <th className="px-4 py-3">Pemeta</th>
                <th className="px-4 py-3">Tgl Mulai</th>
                <th className="px-4 py-3">Tgl Selesai</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Sub</th>
                <th className="px-4 py-3 text-center">Segmen</th>
                <th className="px-4 py-3 text-center">Link</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginated.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{row.kecamatan}</td>
                  <td className="px-4 py-3">{row.desa}</td>
                  <td className="px-4 py-3">{row.sls}</td>
                  <td className="px-4 py-3">{row.pemeriksa}</td>
                  <td className="px-4 py-3">{row.pemeta}</td>
                  <td className="px-4 py-3">{formatDate(row.tgl_awal)}</td>
                  <td className="px-4 py-3">{formatDate(row.tgl_akhir)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{row.jumlah_sub}</td>
                  <td className="px-4 py-3 text-center">{row.jumlah_segmen}</td>
                  <td className="px-4 py-3">
                    {row.link ? (
                      <a
                        href={row.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline text-xs"
                      >
                        Link
                      </a>
                    ) : (
                      <span className="text-gray-400 italic text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 flex gap-2 justify-center">
                    <button
                      onClick={() => setSelectedRow(row)}
                      className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded text-xs"
                    >
                      <Eye size={14} /> View
                    </button>
                    <button
                      onClick={() => setEditRow(row)}
                      className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                  </td>
                </tr>
              ))}

              {paginated.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-4 text-gray-500 italic">
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
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            ⬅ Prev
          </button>
          <span>
            Page {page} / {totalPages || 1}
          </span>
          <button
            disabled={page === totalPages || totalPages === 0}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Next ➡
          </button>
        </div>
      </div>

      {/* Modal */}
      {selectedRow && (
        <ModalView
          data={{
            ...selectedRow,
            jumlah_sub: selectedRow.jumlah_sub ?? 0,
            jumlah_segmen: selectedRow.jumlah_segmen ?? 0,
          }}
          onClose={() => setSelectedRow(null)}
        />
      )}

      {editRow && (
        <ModalEdit
          data={{
            ...editRow,
            jumlah_sub: editRow.jumlah_sub ?? 0,
            jumlah_segmen: editRow.jumlah_segmen ?? 0,
          }}
          onClose={() => setEditRow(null)}
          onSave={handleSaveEdit}
        />
      )}
    </main>
  );
}
