import Link from "next/link";

export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="max-w-xl w-full bg-white shadow-lg rounded-2xl p-6 text-center space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">
          💣 PETASAN
        </h1>
        <p className="text-gray-600 leading-relaxed">
          Selamat datang di Aplikasi Pelaporan Wilkerstat se-Kabupaten Tabanan 
          <span className="font-semibold"> (PETASAN)</span>.  
          <br />
          <br />
            Pelaporan ini dilakukan oleh Petugas Pemeriksa dan Petugas Pemeta <span className="font-semibold">setiap hari</span> melalui Form.
          <br /> 
        </p>

        {/* Tombol navigasi utama */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
          <Link
            href="/form"
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium shadow"
          >
            ✏️ Buka Form
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium shadow"
          >
            📖 Buka Dashboard
          </Link>
        </div>

        {/* Tombol navigasi tambahan */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/cek"
            className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-lg font-medium shadow"
          >
            🔍 Periksa Eform
          </Link>
          <Link
            href="/cek_pemeta"
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium shadow"
          >
            📊 Periksa Muatan Pemeta
          </Link>
        </div>

        {/* Info tambahan dalam card kecil */}
        <div className="mt-6 text-left bg-gray-100 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2 text-black">ℹ️ Informasi Singkat</h2>
          <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
            <li>Halaman <strong>Form</strong> menampilkan tabel data SLS dan Non SLS.</li>
            <li>Anda bisa klik <em>Edit</em> untuk mengedit data.</li>
            <li>Anda bisa klik <em>View</em> untuk melihat detail data.</li>
            <li>Halaman <strong>Dashboard</strong> menampilkan progress/capaian pendataan lapangan.</li>
            <li>Halaman <strong>Periksa Eform</strong> untuk memverifikasi kelengkapan form.</li>
            <li>Halaman <strong>Periksa Muatan Pemeta</strong> untuk melihat distribusi muatan kerja pemeta.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}