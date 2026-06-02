"use client";

import { useState, useEffect, useCallback } from "react";
import { GraduationCap, Printer, Search, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

export default function WisudaPage() {
  const [graduates, setGraduates] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchGraduates = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("graduations")
        .select(`
          *,
          students (*)
        `)
        .order("graduation_date", { ascending: false });

      if (error) throw error;
      setGraduates(data || []);
    } catch (err: any) {
      toast.error("Gagal memuat data wisuda: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraduates();
  }, [fetchGraduates]);

  const filteredGraduates = graduates.filter(g => 
    g.students?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrint = async (item: any) => {
    try {
      const studentName = item.students?.full_name || "";
      const certNum = item.certificate_number || "NO-CERT-NUM";
      const dateStr = new Date(item.graduation_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      const programType = item.les_type === 'les_ahe' ? 'AHE' : 'ASE';
      const bgImage = programType === 'AHE' ? '/BLANKO AHE.jpg' : '/BLANKO ASE.jpg';

      // Update certificate status locally or in db to printed
      if (!item.certificate_url) {
        await supabase
          .from("graduations")
          .update({ certificate_url: "PRINTED" })
          .eq("id", item.id);
      }

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Cetak Piagam - ${studentName}</title>
              <style>
                @page {
                  size: A4 landscape;
                  margin: 0;
                }
                body {
                  margin: 0;
                  padding: 0;
                  width: 297mm;
                  height: 210mm;
                  background-image: url('${bgImage}');
                  background-size: cover;
                  background-position: center;
                  background-repeat: no-repeat;
                  font-family: 'Georgia', serif;
                  position: relative;
                  -webkit-print-color-adjust: exact;
                }
                .cert-number {
                  font-size: 16pt;
                  color: #333333;
                  position: absolute;
                  top: 55mm;
                  width: 100%;
                  text-align: center;
                  font-weight: bold;
                  letter-spacing: 1px;
                }
                .content {
                  position: absolute;
                  width: 100%;
                  text-align: center;
                  top: 90mm;
                }
                .name {
                  font-size: 34pt;
                  font-weight: bold;
                  color: #111111;
                  text-transform: uppercase;
                  text-shadow: 1px 1px 1px rgba(0,0,0,0.1);
                }
                .date {
                  font-size: 16pt;
                  position: absolute;
                  bottom: 40mm;
                  right: 48mm;
                  font-weight: bold;
                  color: #222222;
                }
              </style>
            </head>
            <body>
              <div class="cert-number">No: ${certNum}</div>
              <div class="content">
                <div class="name">${studentName}</div>
              </div>
              <div class="date">Tepus Wetan, ${dateStr}</div>
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                    window.close();
                  }, 500);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
      
      toast.success(`Membuka Piagam ${programType} untuk ${studentName}...`);
      fetchGraduates();
    } catch (err: any) {
      toast.error("Gagal mencetak piagam: " + err.message);
    }
  };

  const handleExport = () => {
    // Simulating export data
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Tanggal Lulus,Nama Murid,Program,Level Terakhir,Nomor Sertifikat"].join(",") + "\n"
      + filteredGraduates.map(g => [
          g.graduation_date,
          g.students?.full_name,
          g.les_type === 'les_ahe' ? 'AHE' : 'ASE',
          g.les_type === 'les_ahe' ? 'Level 8' : 'Level 16',
          g.certificate_number
        ].join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "data_wisuda_ahe.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Data wisuda berhasil diexport!");
  };

  return (
    <div className="space-y-8 font-body-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Manajemen Wisuda</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Daftar murid lulus dan pencetakan piagam penghargaan.</p>
        </div>
        <button onClick={handleExport} className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-headline-sm hover:bg-primary-container transition-colors shadow-sm w-fit">
          <Download className="w-5 h-5" /> Export Data Kelulusan
        </button>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-surface-container bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-headline-sm font-headline-sm text-on-surface">Daftar Alumni & Wisudawan</h3>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Cari nama lulusan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface w-full sm:w-64"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="font-bold text-body-md">Memuat data wisuda...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-surface-container">
                  <th className="p-4 font-label-md text-on-surface-variant">Tanggal Lulus</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Nama Murid</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Program</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Level Terakhir</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Status Piagam</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredGraduates.map((item) => (
                  <tr key={item.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="p-4 text-on-surface font-medium">{new Date(item.graduation_date).toLocaleDateString('id-ID')}</td>
                    <td className="p-4 font-bold text-on-surface">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-primary" /> {item.students?.full_name}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-label-sm font-bold">
                        {item.les_type === 'les_ahe' ? 'AHE' : 'ASE'}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-on-surface">
                      Level {item.les_type === 'les_ahe' ? 8 : 16}
                    </td>
                    <td className="p-4">
                      {item.certificate_url ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-tertiary-container/50 text-tertiary font-bold text-label-sm">Sudah Dicetak</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-error-container/50 text-error font-bold text-label-sm">Belum Dicetak</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handlePrint(item)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary rounded-lg transition-colors font-label-md font-bold"
                      >
                        <Printer className="w-4 h-4" /> Cetak Piagam
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredGraduates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                      Tidak ada data lulusan yang sesuai pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
