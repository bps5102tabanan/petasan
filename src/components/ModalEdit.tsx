"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export type InformasiSLS = {
  id: string;
  kecamatan: string;
  desa: string;
  sls: string;
  pemeriksa: string;
  pemeta: string;
  status: string;
  jumlah_sub?: number;
  jumlah_segmen?: number;
  tgl_awal?: string;
  tgl_akhir?: string;
  catatan?: string;
};

export type SegmenRow = {
  segmen_no: number;
  sub: string;
  muatan: number;
};

type ModalEditProps = {
  data: InformasiSLS | null;
  onClose: () => void;
  onSave: (updated: InformasiSLS, segmenList: SegmenRow[]) => void;
};

export default function ModalEdit({ data, onClose, onSave }: ModalEditProps) {
  const [formData, setFormData] = useState<InformasiSLS | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [segmenList, setSegmenList] = useState<SegmenRow[]>([]);
  const [segmenError, setSegmenError] = useState<Record<number, string[]>>({});

  useEffect(() => {
    const fetchSegmen = async () => {
      if (!data) return;

      setFormData({ ...data });
      setCurrentPage(1);

      const { data: segmenData, error } = await supabase
        .from("informasiSubSLS")
        .select("segmen_no, sub, muatan")
        .eq("sls_id", data.id)
        .order("segmen_no", { ascending: true });

      if (error) {
        console.error("❌ Gagal fetch segmen:", error.message);
        return;
      }

      if (segmenData && segmenData.length > 0) {
        setSegmenList(
          segmenData.map((row) => ({
            segmen_no: row.segmen_no,
            sub: row.sub,
            muatan: row.muatan,
          }))
        );
      } else if (data.jumlah_segmen && data.jumlah_segmen > 0) {
        const rows = Array.from({ length: data.jumlah_segmen }, (_, i) => ({
          segmen_no: i + 1,
          sub: "",
          muatan: 0,
        }));
        setSegmenList(rows);
      } else {
        setSegmenList([]);
      }
    };

    fetchSegmen();
  }, [data]);

  useEffect(() => {
    if (!formData) return;
    const total = formData.jumlah_segmen ?? 0;

    setSegmenList((prev) => {
      const currentLength = prev.length;

      if (total > currentLength) {
        const newSegmen = Array.from(
          { length: total - currentLength },
          (_, i) => ({
            segmen_no: currentLength + i + 1,
            sub: "",
            muatan: 0,
          })
        );
        return [...prev, ...newSegmen];
      } else if (total < currentLength) {
        return prev.slice(0, total);
      }
      return prev;
    });
  }, [formData?.jumlah_segmen]);

  if (!data || !formData) return null;

  const jumlahSub = formData?.jumlah_sub ?? 0;
  const jumlahSegmen = formData?.jumlah_segmen ?? 0;

  // ✅ Validasi jumlah_sub tidak boleh > jumlah_segmen
  const isInvalidJumlah =
    jumlahSub > 0 && jumlahSegmen > 0 && jumlahSub > jumlahSegmen;

  const handleChange = (field: keyof InformasiSLS, value: string | number) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const validateSegmen = (
    idx: number,
    field: keyof SegmenRow,
    value: string | number
  ) => {
    const segmenNo = segmenList[idx].segmen_no;
    const errors: string[] = [];
    let errorMsg = "";

    if (field === "sub") {
      const subVal = Number(value);
      if (subVal > jumlahSub) {
        errorMsg = `⚠️ Sub pada segmen ke-${segmenNo} tidak boleh > jumlah Sub SLS: ${jumlahSub}`;
        errors.push(errorMsg);
      }
    }

    if (field === "muatan") {
      const numVal = Number(value);
      if (numVal > 180) {
        errorMsg = `⚠️ Muatan tidak boleh > 180`;
        errors.push(errorMsg);
      }
    }

    setSegmenError((prev) => ({
      ...prev,
      [segmenNo]: errors,
    }));
  };

  const handleSegmenChange = (
    index: number,
    field: keyof SegmenRow,
    value: string | number
  ) => {
    setSegmenList((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
    validateSegmen(index, field, value);
  };

  const hasInvalidSegmen = Object.values(segmenError).some(
    (msgArr) => msgArr.length > 0 // kalau ada minimal 1 error
  );


  const handleSubmit = () => {
    if (formData && !hasInvalidSegmen) {
      onSave(formData, segmenList);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-[520px] max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <h2 className="text-xl font-bold text-center text-gray-800">
          {currentPage === 1 ? "✏️ Edit Data SLS" : "📋 Isi Detail Segmen"}
        </h2>

        {/* ✅ STEP 1 */}
        {currentPage === 1 && (
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Kecamatan
              </label>
              <input
                type="text"
                value={formData.kecamatan || ""}
                disabled
                className="w-full mt-1 rounded-lg border border-gray-200 bg-gray-100 text-gray-700 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Desa</label>
              <input
                type="text"
                value={formData.desa || ""}
                disabled
                className="w-full mt-1 rounded-lg border border-gray-200 bg-gray-100 text-gray-700 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">SLS</label>
              <input
                type="text"
                value={formData.sls || ""}
                disabled
                className="w-full mt-1 rounded-lg border border-gray-200 bg-gray-100 text-gray-700 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Pemeriksa
                </label>
                <input
                  type="text"
                  value={formData.pemeriksa || ""}
                  disabled
                  className="w-full mt-1 rounded-lg border border-gray-200 bg-gray-100 text-gray-700 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Pemeta
                </label>
                <input
                  type="text"
                  value={formData.pemeta || ""}
                  disabled
                  className="w-full mt-1 rounded-lg border border-gray-200 bg-gray-100 text-gray-700 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-black">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={formData.tgl_awal ?? ""}
                  onChange={(e) => handleChange("tgl_awal", e.target.value)}
                  min="2025-07-25"
                  max="2025-08-31"
                  className="w-full mt-1 rounded-md border border-gray-300 text-black px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-black">
                  Tanggal Selesai
                </label>
                <input
                  type="date"
                  value={formData.tgl_akhir ?? ""}
                  onChange={(e) => handleChange("tgl_akhir", e.target.value)}
                  min="2025-07-25"
                  max="2025-08-31"
                  className="w-full mt-1 rounded-md border border-gray-300 text-black px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                value={formData.status || "Belum"}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full mt-1 rounded-lg border border-gray-300 bg-gray-50 text-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
              >
                <option value="Belum">Belum</option>
                <option value="Proses">Proses</option>
                <option value="Submit">Submit</option>
                <option value="Approve">Approve</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Jumlah Sub</label>
                <div className="mt-1 flex rounded-md border border-gray-300 bg-white overflow-hidden h-10">
                  {/* Tombol minus */}
                  <button
                    type="button"
                    onClick={() =>
                      handleChange(
                        "jumlah_sub",
                        Math.max(0, (formData.jumlah_sub ?? 0) - 1)
                      )
                    }
                    className="w-10 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                  >
                    –
                  </button>

                  {/* Angka di tengah */}
                  <div className="flex-1 flex items-center justify-center text-sm text-gray-800">
                    {formData.jumlah_sub ?? 0}
                  </div>

                  {/* Tombol plus */}
                  <button
                    type="button"
                    onClick={() =>
                      handleChange("jumlah_sub", (formData.jumlah_sub ?? 0) + 1)
                    }
                    className="w-10 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Jumlah Segmen</label>
                <div className="mt-1 flex rounded-md border border-gray-300 bg-white overflow-hidden h-10">
                  {/* Tombol minus */}
                  <button
                    type="button"
                    onClick={() =>
                      handleChange(
                        "jumlah_segmen",
                        Math.max(0, (formData.jumlah_segmen ?? 0) - 1)
                      )
                    }
                    className="w-10 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                  >
                    –
                  </button>

                  {/* Angka di tengah */}
                  <div className="flex-1 flex items-center justify-center text-sm text-gray-800">
                    {formData.jumlah_segmen ?? 0}
                  </div>

                  {/* Tombol plus */}
                  <button
                    type="button"
                    onClick={() =>
                      handleChange("jumlah_segmen", (formData.jumlah_segmen ?? 0) + 1)
                    }
                    className="w-10 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
              
            </div>
            <div>
                <label className="text-sm font-medium text-gray-700">Catatan</label>
                <textarea
                  value={formData.catatan ?? ""}
                  onChange={(e) => handleChange("catatan", e.target.value)}
                  rows={3}
                  placeholder="Tulis catatan tambahan di sini..."
                  className="w-full mt-1 rounded-md border border-gray-300 text-gray-800 text-sm px-3 py-2"
                />
              </div>

            {isInvalidJumlah && (
              <p className="text-red-500 text-sm mt-1">
                ⚠️ Jumlah sub tidak boleh lebih besar dari jumlah segmen
              </p>
            )}
          </div>
        )}

        {/* ✅ STEP 2 */}
        {currentPage === 2 && (
          <div>
            <p className="text-gray-700 text-sm mb-3">
              Isi detail untuk <b>{formData?.jumlah_segmen}</b> segmen:
            </p>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {segmenList.map((segmen, index) => {
                const errorMsgs = segmenError[segmen.segmen_no] ?? [];
                return (
                  <div
                    key={segmen.segmen_no}
                    className="border rounded-md p-3 bg-gray-50 shadow-sm"
                  >
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Segmen {segmen.segmen_no}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600">
                          Sub ke-
                        </label>
                        <input
                          type="number"
                          placeholder={`Sub ke-`}
                          value={segmen.sub}
                          onChange={(e) =>
                            handleSegmenChange(index, "sub", e.target.value)
                          }
                          className="w-full mt-1 rounded-md border text-gray-800 border-gray-300 text-sm px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">
                          Muatan
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={segmen.muatan === 0 ? "" : segmen.muatan}
                          onChange={(e) =>
                            handleSegmenChange(
                              index,
                              "muatan",
                              Number(e.target.value)
                            )
                          }
                          className="w-full mt-1 rounded-md border text-gray-800 border-gray-300 text-sm px-3 py-2"
                        />
                      </div>
                    </div>
                    {errorMsgs.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {errorMsgs.map((msg, i) => (
                          <p key={i} className="text-red-500 text-xs">{msg}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ✅ Footer */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          {currentPage === 1 ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 transition"
              >
                ✖ Batal
              </button>
              <button
                onClick={() => setCurrentPage(2)}
                disabled={
                  !formData?.jumlah_segmen ||
                  formData?.jumlah_segmen <= 0 ||
                  isInvalidJumlah
                }
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 text-sm transition disabled:opacity-50"
              >
                Next →
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setCurrentPage(1)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 transition"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={hasInvalidSegmen}
                className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 text-sm transition disabled:opacity-50"
              >
                ✅ Simpan
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
