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
import axios from "axios";

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

type TargetSLS = {
  id: string;
  idsls: string;
  tanggal: string; // e.g. "15/08/2025"
  target: number | string;
};

type ChartRow = {
  code: string;
  name: string;
  approve?: number;
  submit?: number;
  proses: number;
  belum: number;
};

type MetabaseSLSData = {
  id_kec: string;         // dari index 0 (sebenarnya index 1 di array)
  nama_kec: string;       // dari index 2
  persentase_eform: number; // dari index 13
};

const StyledSchedulerFrame = styled.div`
  position: relative;
  height: 60vh;
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
`;

const totalTargetMap: Record<string, number> = {
  "5102010": 59,
  "5102011": 71,
  "5102012": 72,
  "5102020": 90,
  "5102030": 82,
  "5102040": 106,
  "5102050": 71,
  "5102060": 70,
  "5102070": 132,
  "5102080": 71,
};

const getIdKec = (id: string | number) => String(id).slice(0, 7);
const getIdDesa = (id: string | number) => String(id).slice(0, 10);
const sortByCode = (a: string, b: string) => parseInt(a) - parseInt(b);

const parseTargetDate = (tanggal?: string) => {
  if (!tanggal) return null;
  if (tanggal.includes("/")) {
    const parts = tanggal.split("/");
    if (parts.length === 3) {
      const [d, m, y] = parts;
      const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      return dayjs(iso).tz("Asia/Makassar").startOf("day");
    }
  }
  return dayjs(tanggal).tz("Asia/Makassar").startOf("day");
};

const fetchMetabaseData = async (): Promise<MetabaseSLSData[]> => {
  try {
    const response = await axios.get('/api/metabase')
    const kecamatanRows = response.data.data.rows.slice(15, 25)
    
    return kecamatanRows.map((row: never[]) => ({
      id_kec: String(row[1]).trim(),
      nama_kec: String(row[2]).trim().toUpperCase(),
      persentase_eform: Math.round(row[13] * 100 * 100) / 100
    }))
  } catch (error) {
    console.error("Error fetching Metabase data:", error)
    return []
  }
}


export default function DashboardWithChartAndScheduler() {
  const [data, setData] = useState<InformasiSLS[]>([]);
  const [targetData, setTargetData] = useState<TargetSLS[]>([]);
  const [metabaseData, setMetabaseData] = useState<MetabaseSLSData[]>([]);
  const [filterKecamatan, setFilterKecamatan] = useState("");
  const [filterPemeriksa, setFilterPemeriksa] = useState("");
  const [filterPemeta, setFilterPemeta] = useState("");
  const [appliedFilter, setAppliedFilter] = useState<{ pemeriksa: string; pemeta: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const [metabaseResult, informasiResult, targetResult] = await Promise.all([
          fetchMetabaseData(),
          supabase.from("informasiSLS").select("*"),
          supabase.from("targetSLS").select("id, idsls, tanggal, target")
        ]);

        setMetabaseData(metabaseResult);
        if (informasiResult.error) console.error("informasiSLS fetch error:", informasiResult.error);
        else setData(informasiResult.data as InformasiSLS[]);
        if (targetResult.error) console.error("targetSLS fetch error:", targetResult.error);
        else setTargetData((targetResult.data as TargetSLS[]) || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, []);

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
    return filterKecamatan ? data.filter((d) => d.kecamatan === filterKecamatan) : data;
  }, [data, filterKecamatan]);

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
      const desaMap: Record<string, { approve: number; submit: number; proses: number; belum: number; total: number }> = {};
      filteredData.forEach((row) => {
        const code = getIdDesa(row.id);
        if (!desaMap[code]) desaMap[code] = { approve: 0, submit: 0, proses: 0, belum: 0, total: 0 };
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
      const kecMap: Record<string, { approve: number; submit: number; proses: number; belum: number; total: number }> = {};
      data.forEach((row) => {
        const code = getIdKec(row.id);
        if (!kecMap[code]) kecMap[code] = { approve: 0, submit: 0, proses: 0, belum: 0, total: 0 };
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

  const pemeriksaList = useMemo(() => Array.from(new Set(data.map((d) => d.pemeriksa))).filter(Boolean), [data]);

  const pemetaList = useMemo(() => {
    return Array.from(
      new Set(
        data
          .filter((d) => (filterPemeriksa ? d.pemeriksa === filterPemeriksa : true))
          .map((d) => d.pemeta)
      )
    ).filter(Boolean);
  }, [data, filterPemeriksa]);

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

      if (!groupMap[key]) {
        groupMap[key] = {
          id: key,
          label: {
            icon: "",
            title: row.sls ?? "Tanpa Nama SLS",
            subtitle: `${row.pemeta || "-"}`,
          },
          data: [],
        };
      }

      if (row.tgl_awal && row.tgl_akhir) {
        const start = new Date(row.tgl_awal);
        const end = new Date(row.tgl_akhir);

        const statusColorMap: Record<string, string> = {
          Belum: "rgb(239,68,68)",
          Proses: "rgb(234,179,8)",
          Submit: "rgb(59,130,246)",
          Approve: "rgb(16,185,129)",
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
          bgColor: statusColorMap[row.status ?? "Belum"] ?? "rgb(107,114,128)",
        });
      }
    });

    return Object.values(groupMap).sort((a, b) => {
      const aStart = a.data[0]?.startDate ? new Date(a.data[0].startDate).getTime() : Infinity;
      const bStart = b.data[0]?.startDate ? new Date(b.data[0].startDate).getTime() : Infinity;
      return aStart - bStart;
    });
  }, [appliedFilter, data]);

  const rekapKecamatan = useMemo(() => {
    const targetToday = targetData.filter((t) => {
      const pd = parseTargetDate(t.tanggal);
      return pd ? pd.isSame(now, "day") : false;
    });

    const targetMap: Record<string, number> = {};
    targetToday.forEach((t) => {
      const kodeKec = getIdKec(t.idsls);
      const val = Number(t.target || 0);
      targetMap[kodeKec] = (targetMap[kodeKec] || 0) + val;
    });

    const realisasiMap: Record<string, number> = {};
    data.forEach((row) => {
      const kodeKec = getIdKec(row.id);
      if (row.status === "Approve" || row.status === "Submit") {
        realisasiMap[kodeKec] = (realisasiMap[kodeKec] || 0) + 1;
      }
    });

    const allKode = Array.from(new Set([...Object.keys(targetMap), ...Object.keys(realisasiMap)])).sort((a, b) => parseInt(a) - parseInt(b));

    return allKode.map((kode) => ({
      code: kode,
      name: data.find((d) => getIdKec(d.id) === kode)?.kecamatan || `Kecamatan ${kode}`,
      target: targetMap[kode] || 0,
      realisasi: realisasiMap[kode] || 0,
    }));
  }, [data, targetData]);

  return (
    <main className="flex flex-col items-center bg-gray-50 p-6 space-y-8 min-h-screen">
      <div className="max-w-6xl w-full bg-white shadow-lg rounded-2xl p-6 space-y-6">
        <button
          onClick={() => router.push("/")}
          className="mb-4 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center gap-2"
        >
          ⬅ Kembali ke Halaman Utama
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          📊 Dashboard Progress & 🗓 Scheduler
        </h1>

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

        <div className="bg-gray-50 rounded-lg p-4 border">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 40 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(value: number) =>
                  typeof value === "number" ? `${value.toFixed(1)}%` : value
                }
              />
              <Legend />
              <Bar dataKey="approve" stackId="a" fill="#10b981" name="Approve" />
              <Bar dataKey="submit" stackId="a" fill="#3b82f6" name="Submit" />
              <Bar dataKey="proses" stackId="a" fill="#eab308" name="Proses" />
              <Bar dataKey="belum" stackId="a" fill="#ef4444" name="Belum" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100 text-sm text-gray-700">
                <th className="px-4 py-2 border">Kode Kecamatan</th>
                <th className="px-4 py-2 border">Nama Kecamatan</th>
                <th className="px-4 py-2 border text-center">Total Target</th>
                <th className="px-4 py-2 border text-center">Target Hari ini</th>
                <th className="px-4 py-2 border text-center">Realisasi (PETASAN)</th>
                <th className="px-4 py-2 border text-center">% PETASAN</th>
                <th className="px-4 py-2 border text-center">% eForm</th>
              </tr>
            </thead>
            <tbody>
             {rekapKecamatan.map((row) => {
                const totalTarget = totalTargetMap[row.code] || 0;
                const percentagePetasan = totalTarget > 0 
                  ? ((row.realisasi / totalTarget) * 100).toFixed(1) 
                  : '0.0';
                
                // Cari data eForm berdasarkan kode kecamatan
                const metabaseRow = metabaseData.find(item => item.id_kec === row.code);
                const percentageEform = metabaseRow?.persentase_eform || 0;

                return (
                  <tr key={row.code} className="text-sm text-gray-800 text-center">
                    <td className="border px-4 py-2">{row.code}</td>
                    <td className="border px-4 py-2 text-left">{row.name}</td>
                    <td className="border px-4 py-2">{totalTarget}</td>
                    <td className="border px-4 py-2">{row.target}</td>
                    <td className="border px-4 py-2">{row.realisasi}</td>
                    <td className="border px-4 py-2">{percentagePetasan}%</td>
                    <td className="border px-4 py-2">
                      {metabaseRow ? `${percentageEform}%` : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

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