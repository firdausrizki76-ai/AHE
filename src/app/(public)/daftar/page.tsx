"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export default function DaftarPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    gender: "",
    parentName: "",
    phone: "",
    program: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelect = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      const prevDataStr = localStorage.getItem("ahe_registrations");
      const prevData = prevDataStr ? JSON.parse(prevDataStr) : [];
      
      const newReg = {
        id: `r${Date.now()}`,
        ...formData,
        status: "pending",
        date: new Date().toISOString().split('T')[0]
      };
      
      localStorage.setItem("ahe_registrations", JSON.stringify([...prevData, newReg]));
      setIsSuccess(true);
      toast.success("Pendaftaran berhasil dikirim!");
    } catch (error) {
      toast.error("Gagal mengirim pendaftaran.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
        <Card className="w-full max-w-md text-center glass border-primary/20">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <ShieldCheck className="w-16 h-16 text-primary" />
            </div>
            <CardTitle className="text-2xl">Pendaftaran Berhasil</CardTitle>
            <CardDescription>
              Terima kasih, data <strong>{formData.name}</strong> telah kami terima. Tim AHE akan segera menghubungi Anda melalui WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={() => router.push('/login')}>Kembali ke Halaman Login</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 flex justify-center bg-gray-50 dark:bg-zinc-950">
      <Card className="w-full max-w-2xl glass">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Formulir Pendaftaran Siswa Baru</CardTitle>
          <CardDescription>Isi data dengan lengkap dan benar. Biaya pendaftaran gratis.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap Anak</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required placeholder="Contoh: Budi Santoso" />
              </div>
              
              <div className="space-y-2">
                <Label>Jenis Kelamin</Label>
                <Select onValueChange={(val) => { if (val) handleSelect('gender', String(val)); }} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Jenis Kelamin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="parentName">Nama Orang Tua/Wali</Label>
                <Input id="parentName" name="parentName" value={formData.parentName} onChange={handleChange} required placeholder="Nama Ibu/Bapak" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">No. WhatsApp</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} required placeholder="081234567890" type="tel" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Program Les Pilihan</Label>
              <Select onValueChange={(val) => { if (val) handleSelect('program', String(val)); }} required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Program Les" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Les AHE">AHE (Anak Hebat) - Membaca</SelectItem>
                  <SelectItem value="Les ASE">ASE (Anak Soleh) - Mengaji</SelectItem>
                  <SelectItem value="Les Mapel">Bimbingan Belajar Mata Pelajaran</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full text-lg h-12" disabled={isLoading}>
              {isLoading ? "Mengirim Data..." : "Kirim Pendaftaran"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
