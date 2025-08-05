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
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

const now = dayjs().tz("Asia/Makassar").startOf("day");

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
  catatan?: string;
};

type ChartRow = {
  code: string;
  name: string;
  approve?: number;
  submit?: number;
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
    const makeRow = (name: string, approve: number, submit: number, proses: number, belum: number, total: number) => ({
      name,
      code: name,
      approve: (approve / total) * 100,
      submit: (submit / total) * 100,
      proses: (proses / total) * 100,
      belum: (belum / total) * 100,
    });

    if (filterKecamatan) {
      const desaMap: Record<string, { approve: number, submit: number; proses: number; belum: number; total: number }> = {};
      filteredData.forEach((row) => {
        const code = getIdDesa(row.id);
        if (!desaMap[code]) desaMap[code] = { approve: 0, submit:0, proses: 0, belum: 0, total: 0 };
        desaMap[code].total++;
        if (row.status === "Approve") desaMap[code].approve++;
        else if (row.status === "Submit") desaMap[code].submit++;
        else if (row.status === "Proses") desaMap[code].proses++;
        else desaMap[code].belum++;
      });

      return Object.entries(desaMap).map(([code, v]) =>
        makeRow(filteredData.find((d) => getIdDesa(d.id) === code)?.desa || code, v.approve, v.submit, v.proses, v.belum, v.total)
      );
    } else {
      const kecMap: Record<string, { approve: number, submit: number; proses: number; belum: number; total: number }> = {};
      data.forEach((row) => {
        const code = getIdKec(row.id);
        if (!kecMap[code]) kecMap[code] = { approve: 0, submit:0, proses: 0, belum: 0, total: 0 };
        kecMap[code].total++;
        if (row.status === "Approve") kecMap[code].approve++;
        else if (row.status === "Submit") kecMap[code].submit++;
        else if (row.status === "Proses") kecMap[code].proses++;
        else kecMap[code].belum++;
      });

      return Object.entries(kecMap).map(([code, v]) =>
        makeRow(data.find((d) => getIdKec(d.id) === code)?.kecamatan || code, v.approve, v.submit, v.proses, v.belum, v.total)
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

        const statusColorMap: Record<string, string> = {
          Belum: "rgb(239,68,68)",    // merah
          Proses: "rgb(234,179,8)",   // kuning
          Submit: "rgb(59,130,246)",  // biru
          Approve: "rgb(16,185,129)", // hijau
        };

        groupMap[key].data.push({
          id: row.id,
          startDate: start,
          endDate: end,
          title: row.sls ?? "Tanpa Nama SLS",
          subtitle: [
            `Pemeriksa     : ${row.pemeriksa || "-"}`,
            `Pemeta        : ${row.pemeta || "-"}`,
            `Jumlah Sub    : ${row.jumlah_sub || 0}`,
            `Jumlah Segmen : ${row.jumlah_segmen || 0}`,
            `Catatan       : ${row.catatan || "-"}`,
          ].join("\n"),
          description: row.status ?? "-",
          occupancy: 0,
          bgColor: statusColorMap[row.status ?? "Belum"] ?? "rgb(107,114,128)", // default abu-abu
        });
      }
    });

    return Object.values(groupMap).sort((a, b) => {
      const aStart = a.data[0]?.startDate ? new Date(a.data[0].startDate).getTime() : Infinity;
      const bStart = b.data[0]?.startDate ? new Date(b.data[0].startDate).getTime() : Infinity;
      return aStart - bStart;
    });
  }, [appliedFilter, data]);

  // Hitung target dan realisasi per kecamatan
const rekapKecamatan = useMemo(() => {
  const kecMap: Record<string, { name: string; target: number; realisasi: number }> = {};

  data.forEach((row) => {
    const kode = getIdKec(row.id);
    const nama = row.kecamatan || kode;

    if (!kecMap[kode]) {
      kecMap[kode] = { name: nama, target: 0, realisasi: 0 };
    }

    // ✅ Hitung target: tgl_akhir ≤ hari ini (UTC+8)
    if (
      row.tgl_akhir &&
      (dayjs(row.tgl_akhir).isSame(now) || dayjs(row.tgl_akhir).isBefore(now))
    ) {
      kecMap[kode].target += 1;
    }

    // ✅ Hitung realisasi: status === Approve
    if (row.status === "Approve") {
      kecMap[kode].realisasi += 1;
    }
  });

  return Object.entries(kecMap)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([code, v]) => ({ code, ...v }));
}, [data]);

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
              <Bar dataKey="approve" stackId="a" fill="#10b981" name="Approve" />
              <Bar dataKey="submit" stackId="a" fill="#3b82f6" name="Submit" />
              <Bar dataKey="proses" stackId="a" fill="#eab308" name="Proses" />
              <Bar dataKey="belum" stackId="a" fill="#ef4444" name="Belum" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* === Tabel Rekap Target dan Realisasi === */}
        {/*}
        
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100 text-sm text-gray-700">
                <th className="px-4 py-2 border">Kode Kecamatan</th>
                <th className="px-4 py-2 border">Nama Kecamatan</th>
                <th className="px-4 py-2 border text-center">🎯 Target</th>
                <th className="px-4 py-2 border text-center">✅ Realisasi (Approve)</th>
              </tr>
            </thead>
            <tbody>
              {rekapKecamatan.map((row) => (
                <tr key={row.code} className="text-sm text-gray-800 text-center">
                  <td className="border px-4 py-2">{row.code}</td>
                  <td className="border px-4 py-2 text-left">{row.name}</td>
                  <td className="border px-4 py-2">{row.target}</td>
                  <td className="border px-4 py-2">{row.realisasi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        */}

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
                onTileClick={(item) => alert(`${item.subtitle}`)}
                
                config={{
                  zoom: 1,
                  maxRecordsPerPage: 15,
                  includeTakenHoursOnWeekendsInDayView: true,
                  showTooltip: false,
                  filterButtonState: -1,
                  
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
