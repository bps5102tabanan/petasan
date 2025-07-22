"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SegmenRow = {
  segmen_no: number;
  sub: string;
  muatan: number;
};

type ModalViewProps = {
  data: {
    id: string;
    kecamatan: string;
    desa: string;
    sls: string;
    pemeriksa: string;
    pemeta: string;
    status: string;
    jumlah_sub: number;
    jumlah_segmen: number;
    tgl_awal?: string;
    tgl_akhir?: string;
  };
  onClose: () => void;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Belum":
      return "bg-red-50 text-red-600 ring-1 ring-red-200";
    case "Proses":
      return "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-300";
    case "Selesai":
      return "bg-green-50 text-green-700 ring-1 ring-green-300";
    default:
      return "bg-gray-50 text-gray-600 ring-1 ring-gray-200";
  }
};

export default function ModalView({ data, onClose }: ModalViewProps) {
  const [segmenList, setSegmenList] = useState<SegmenRow[]>([]);

  // ✅ Ambil daftar segmen untuk SLS ini
  useEffect(() => {
    const fetchSegmen = async () => {
      const { data: segmenData, error } = await supabase
        .from("informasiSubSLS")
        .select("segmen_no, sub, muatan")
        .eq("sls_id", data.id)
        .order("segmen_no", { ascending: true });

      if (!error && segmenData) {
        setSegmenList(segmenData);
      }
    };
    fetchSegmen();
  }, [data.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-[500px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            📄 Detail SLS
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            ✖
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Status Badge */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Status</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                data.status
              )}`}
            >
              {data.status}
            </span>
          </div>

          {/* Full width rows */}
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Kecamatan</p>
              <p className="font-semibold text-gray-800">{data.kecamatan}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Desa</p>
              <p className="font-semibold text-gray-800">{data.desa}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">SLS</p>
              <p className="font-semibold text-gray-800">{data.sls}</p>
            </div>
          </div>

          {/* Grid 2 kolom */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Pemeriksa</p>
              <p className="font-semibold text-gray-800">{data.pemeriksa}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Pemeta</p>
              <p className="font-semibold text-gray-800">{data.pemeta}</p>
            </div>

            <div>
              <p className="text-gray-500 text-xs">Tanggal Mulai</p>
              <p className="font-semibold text-gray-800">
                {data.tgl_awal || "-"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Tanggal Selesai</p>
              <p className="font-semibold text-gray-800">
                {data.tgl_akhir || "-"}
              </p>
            </div>

            <div>
              <p className="text-gray-500 text-xs">Jumlah Sub</p>
              <p className="font-semibold text-gray-800">{data.jumlah_sub}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Jumlah Segmen</p>
              <p className="font-semibold text-gray-800">
                {data.jumlah_segmen}
              </p>
            </div>
          </div>

          {/* Segmen List */}
          <div className="mt-6">
            <h3 className="text-sm font-bold text-gray-700 mb-2">
              📌 Detail Segmen
            </h3>
            {segmenList.length === 0 ? (
              <p className="text-gray-500 text-sm">
                Tidak ada segmen yang terdaftar.
              </p>
            ) : (
              <div className="space-y-3 max-h-[200px] overflow-y-auto">
                {segmenList.map((segmen) => (
                  <div
                    key={segmen.segmen_no}
                    className="border rounded-md p-3 bg-gray-50 shadow-sm"
                  >
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      Segmen {segmen.segmen_no}
                    </p>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Sub ke-{segmen.sub}</span>
                      <span>Muatan: {segmen.muatan}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
          >
            ✖ Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
