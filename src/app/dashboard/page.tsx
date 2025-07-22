"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { Scheduler, SchedulerData } from "@bitnoi.se/react-scheduler";
import "@bitnoi.se/react-scheduler/dist/style.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";

type InformasiSLS = {
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
};

type ChartRow = {
  code: string;
  name: string;
  selesai: number;
  proses: number;
  belum: number;
};

const StyledSchedulerFrame = styled.div`
  position: relative;
  height: 60vh;
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
`;

const getIdKec = (id: string | number) => String(id).slice(0, 7);
const getIdDesa = (id: string | number) => String(id).slice(0, 10);
const sortByCode = (a: string, b: string) => parseInt(a) - parseInt(b);

export default function DashboardWithChartAndScheduler() {
  const [data, setData] = useState<InformasiSLS[]>([]);
  const [filterKecamatan, setFilterKecamatan] = useState("");
  const [filterPemeriksa, setFilterPemeriksa] = useState("");
  const [filterPemeta, setFilterPemeta] = useState("");
  const [appliedFilter, setAppliedFilter] = useState<{ pemeriksa: string; pemeta: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // ✅ Ambil data dari Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data: hasil, error } = await supabase.from("informasiSLS").select("*");
      if (error) console.error(error);
      else setData(hasil as InformasiSLS[]);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // ✅ Daftar Kecamatan
  const kecamatanList = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach((d) => {
      const kode = getIdKec(d.id);
      if (!map.has(kode)) map.set(kode, d.kecamatan);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => sortByCode(a, b))
      .map(([code, name]) => ({ code, name }));
  }, [data]);

  const filteredData = useMemo(() => {
    return filterKecamatan
      ? data.filter((d) => d.kecamatan === filterKecamatan)
      : data;
  }, [data, filterKecamatan]);

  // ✅ Data untuk Bar Chart
  const chartData: ChartRow[] = useMemo(() => {
    const makeRow = (name: string, selesai: number, proses: number, belum: number, total: number) => ({
      name,
      code: name,
      selesai: (selesai / total) * 100,
      proses: (proses / total) * 100,
      belum: (belum / total) * 100,
    });

    if (filterKecamatan) {
      const desaMap: Record<string, { selesai: number; proses: number; belum: number; total: number }> = {};
      filteredData.forEach((row) => {
        const code = getIdDesa(row.id);
        if (!desaMap[code]) desaMap[code] = { selesai: 0, proses: 0, belum: 0, total: 0 };
        desaMap[code].total++;
        if (row.status === "Selesai") desaMap[code].selesai++;
        else if (row.status === "Proses") desaMap[code].proses++;
        else desaMap[code].belum++;
      });

      return Object.entries(desaMap).map(([code, v]) =>
        makeRow(filteredData.find((d) => getIdDesa(d.id) === code)?.desa || code, v.selesai, v.proses, v.belum, v.total)
      );
    } else {
      const kecMap: Record<string, { selesai: number; proses: number; belum: number; total: number }> = {};
      data.forEach((row) => {
        const code = getIdKec(row.id);
        if (!kecMap[code]) kecMap[code] = { selesai: 0, proses: 0, belum: 0, total: 0 };
        kecMap[code].total++;
        if (row.status === "Selesai") kecMap[code].selesai++;
        else if (row.status === "Proses") kecMap[code].proses++;
        else kecMap[code].belum++;
      });

      return Object.entries(kecMap).map(([code, v]) =>
        makeRow(data.find((d) => getIdKec(d.id) === code)?.kecamatan || code, v.selesai, v.proses, v.belum, v.total)
      );
    }
  }, [data, filteredData, filterKecamatan]);

  const pemeriksaList = useMemo(
    () => Array.from(new Set(data.map((d) => d.pemeriksa))).filter(Boolean),
    [data]
  );

  const pemetaList = useMemo(() => {
    return Array.from(
      new Set(
        data
          .filter((d) => (filterPemeriksa ? d.pemeriksa === filterPemeriksa : true))
          .map((d) => d.pemeta)
      )
    ).filter(Boolean);
  }, [data, filterPemeriksa]);

  // ✅ SchedulerData dengan tipe yang aman
  const schedulerData: SchedulerData = useMemo(() => {
    if (!appliedFilter) return [];

    const filtered = data.filter(
      (d) =>
        (!appliedFilter.pemeriksa || d.pemeriksa === appliedFilter.pemeriksa) &&
        (!appliedFilter.pemeta || d.pemeta === appliedFilter.pemeta)
    );

    const groupMap: Record<string, SchedulerData[number]> = {};

    filtered.forEach((row) => {
      const key = row.sls || "Tanpa Nama SLS";

      // ✅ Pastikan label.title & subtitle selalu string
      if (!groupMap[key]) {
        groupMap[key] = {
          id: key,
          label: {
            icon: "",
            title: row.sls ?? "Tanpa Nama SLS",
            subtitle: `${row.pemeta || "-"}`
          },
          data: []
        };
      }

      // ✅ Hanya tambahkan timeline jika ada tgl_awal & tgl_akhir
      if (row.tgl_awal && row.tgl_akhir) {
        const start = new Date(row.tgl_awal);
        const end = new Date(row.tgl_akhir);

        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          groupMap[key].data.push({
            id: row.id,
            startDate: start,
            endDate: end,
            title: row.sls ?? "Tanpa Nama SLS",
            subtitle: `${row.pemeta || "-"} - ${row.kecamatan || ""} ${row.desa || ""}`.trim(),
            description: row.status ?? "-",
            occupancy: 0,
            bgColor:
              row.status === "Selesai"
                ? "rgb(34,197,94)"
                : row.status === "Proses"
                ? "rgb(234,179,8)"
                : "rgb(239,68,68)"
          });
        }
      }
    });

    return Object.values(groupMap);
  }, [appliedFilter, data]);

  return (
    <main className="flex flex-col items-center bg-gray-50 p-6 space-y-8 min-h-screen">
      <div className="max-w-6xl w-full bg-white shadow-lg rounded-2xl p-6 space-y-6">
        {/* 🔙 Tombol kembali */}
        <button
          onClick={() => router.push("/")}
          className="mb-4 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center gap-2"
        >
          ⬅ Kembali ke Halaman Utama
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          📊 Dashboard Progress & 🗓 Scheduler
        </h1>

        {/* === Filter Kecamatan === */}
        <div className="flex items-center gap-4">
          <label className="text-gray-700 font-medium">Filter Kecamatan:</label>
          <select
            value={filterKecamatan}
            onChange={(e) => setFilterKecamatan(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Semua Kecamatan</option>
            {kecamatanList.map((k) => (
              <option key={k.code} value={k.name}>
                {k.name}
              </option>
            ))}
          </select>
        </div>

        {/* === Bar Chart === */}
        <div className="bg-gray-50 rounded-lg p-4 border">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 40 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(value: number | string | (number | string)[] | undefined) => {
                  if (Array.isArray(value)) {
                    return value.map((v) => (typeof v === "number" ? `${v.toFixed(1)}%` : v)).join(", ");
                  }
                  return typeof value === "number" ? `${value.toFixed(1)}%` : value;
                }}
              />
              <Legend />
              <Bar dataKey="selesai" stackId="a" fill="#22c55e" name="Selesai" />
              <Bar dataKey="proses" stackId="a" fill="#eab308" name="Proses" />
              <Bar dataKey="belum" stackId="a" fill="#ef4444" name="Belum" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* === Filter Pemeriksa & Pemeta === */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-700">Pemeriksa</label>
            <select
              value={filterPemeriksa}
              onChange={(e) => {
                setFilterPemeriksa(e.target.value);
                setFilterPemeta("");
              }}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="">Semua</option>
              {pemeriksaList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700">Pemeta</label>
            <select
              value={filterPemeta}
              onChange={(e) => setFilterPemeta(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="">Semua</option>
              {pemetaList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() =>
                setAppliedFilter({ pemeriksa: filterPemeriksa, pemeta: filterPemeta })
              }
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              ✅ Apply Filter
            </button>
          </div>
        </div>

        {/* === Scheduler === */}
        {appliedFilter && schedulerData.length > 0 && (
          <div className="bg-white shadow rounded-xl border p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              🗓 Timeline SLS
            </h3>
            <StyledSchedulerFrame>
              <Scheduler
                data={schedulerData}
                isLoading={isLoading}
                onTileClick={(row) => console.log("Row clicked:", row)}
                onItemClick={(item) => alert(`📌 ${item.label}`)}
                config={{
                  zoom: 0,
                  maxRecordsPerPage: 15,
                  includeTakenHoursOnWeekendsInDayView: true,
                  showTooltip: true,
                }}
              />
            </StyledSchedulerFrame>
          </div>
        )}

        {appliedFilter && schedulerData.length === 0 && (
          <div className="text-center text-gray-500 p-4 border rounded">
            ❌ Tidak ada data untuk filter ini
          </div>
        )}
      </div>
    </main>
  );
}
