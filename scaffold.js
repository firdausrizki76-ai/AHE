const fs = require('fs');
const path = require('path');

const adminRoutes = [
  'dashboard', 'pendaftaran', 'murid', 'guru', 'kelas', 'absensi', 
  'prestasi', 'evaluasi', 'wisuda', 'pembayaran', 'tabungan', 'poin', 'laporan'
];

const guruRoutes = [
  'dashboard', 'absen', 'prestasi', 'evaluasi', 'profil'
];

const muridRoutes = [
  'dashboard', 'tabungan', 'tagihan', 'jenjang', 'absensi', 'poin', 'prestasi', 'izin', 'profil'
];

const baseLayoutContent = `"use client";
import DashboardLayout from "@/components/layouts/DashboardLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
`;

const getPageContent = (role, route) => {
  const Title = route.charAt(0).toUpperCase() + route.slice(1);
  return `"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ${Title}Page() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">${Title}</h2>
        <p className="text-muted-foreground">Halaman ${route} untuk portal ${role}.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Informasi ${Title}</CardTitle>
          <CardDescription>Konten halaman sedang dalam pengembangan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground">Segera Hadir</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
`;
};

const createRoutes = (role, routes) => {
  const roleDir = path.join(__dirname, 'src', 'app', `(${role})`, role);
  
  if (!fs.existsSync(roleDir)) {
    fs.mkdirSync(roleDir, { recursive: true });
  }

  // Create layout
  fs.writeFileSync(path.join(roleDir, 'layout.tsx'), baseLayoutContent);

  // Create pages
  routes.forEach(route => {
    const pageDir = path.join(roleDir, route);
    if (!fs.existsSync(pageDir)) {
      fs.mkdirSync(pageDir, { recursive: true });
    }
    fs.writeFileSync(path.join(pageDir, 'page.tsx'), getPageContent(role, route));
  });
};

createRoutes('admin', adminRoutes);
createRoutes('guru', guruRoutes);
createRoutes('murid', muridRoutes);

console.log("Scaffolding complete.");
