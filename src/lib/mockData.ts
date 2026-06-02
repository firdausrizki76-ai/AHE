export const MOCK_USERS = [
  { id: 'u1', name: 'Admin AHE', username: 'admin', role: 'admin', password: 'password' },
  { id: 'u2', name: 'Budi Santoso', username: 'guru1', role: 'guru', password: 'password' },
  { id: 'u3', name: 'Siti Aminah', username: 'guru2', role: 'guru', password: 'password' },
  { id: 'u4', name: 'Andi Wijaya', username: 'guru3', role: 'guru', password: 'password' },
  { id: 'u5', name: 'Rina Kusuma', username: 'guru4', role: 'guru', password: 'password' },
  { id: 'u6', name: 'Eko Prasetyo', username: 'guru5', role: 'guru', password: 'password' },
  { id: 'u7', name: 'Ahmad Faisal', username: 'murid1', role: 'murid', password: 'password' },
  { id: 'u8', name: 'Bunga Citra', username: 'murid2', role: 'murid', password: 'password' },
  { id: 'u9', name: 'Candra Dinata', username: 'murid3', role: 'murid', password: 'password' },
  { id: 'u10', name: 'Dian Sastro', username: 'murid4', role: 'murid', password: 'password' },
  { id: 'u11', name: 'Eka Saputra', username: 'murid5', role: 'murid', password: 'password' },
];

export const MOCK_STUDENTS = [
  { id: 's1', userId: 'u7', nis: 'AHE-2024-001', name: 'Ahmad Faisal', gender: 'L', class: 'AHE Level 3', status: 'active', points: 15, savings: 50000 },
  { id: 's2', userId: 'u8', nis: 'AHE-2024-002', name: 'Bunga Citra', gender: 'P', class: 'AHE Level 4', status: 'active', points: 20, savings: 75000 },
  { id: 's3', userId: 'u9', nis: 'AHE-2024-003', name: 'Candra Dinata', gender: 'L', class: 'ASE Level 1', status: 'active', points: 5, savings: 10000 },
  { id: 's4', userId: 'u10', nis: 'AHE-2024-004', name: 'Dian Sastro', gender: 'P', class: 'AHE Level 2', status: 'active', points: 10, savings: 30000 },
  { id: 's5', userId: 'u11', nis: 'AHE-2024-005', name: 'Eka Saputra', gender: 'L', class: 'ASE Level 5', status: 'active', points: 45, savings: 150000 },
];

export const MOCK_TEACHERS = [
  { id: 't1', userId: 'u2', nip: 'G-001', name: 'Budi Santoso', gender: 'L', status: 'active', classes: ['AHE Level 3', 'ASE Level 1'] },
  { id: 't2', userId: 'u3', nip: 'G-002', name: 'Siti Aminah', gender: 'P', status: 'active', classes: ['AHE Level 4'] },
  { id: 't3', userId: 'u4', nip: 'G-003', name: 'Andi Wijaya', gender: 'L', status: 'active', classes: ['ASE Level 5'] },
  { id: 't4', userId: 'u5', nip: 'G-004', name: 'Rina Kusuma', gender: 'P', status: 'active', classes: ['AHE Level 2'] },
  { id: 't5', userId: 'u6', nip: 'G-005', name: 'Eko Prasetyo', gender: 'L', status: 'active', classes: ['Mapel Matematika'] },
];

export const MOCK_REGISTRATIONS = [
  { id: 'r1', name: 'Fajar Nugraha', gender: 'L', parentName: 'Bapak Nugraha', phone: '081234567890', program: 'Les AHE', status: 'pending', date: '2024-05-30' },
  { id: 'r2', name: 'Gita Pertiwi', gender: 'P', parentName: 'Ibu Pertiwi', phone: '081298765432', program: 'Les ASE', status: 'pending', date: '2024-05-31' },
];

export const initializeMockData = () => {
  if (typeof window === 'undefined') return;
  
  if (!localStorage.getItem('ahe_users')) {
    localStorage.setItem('ahe_users', JSON.stringify(MOCK_USERS));
  }
  if (!localStorage.getItem('ahe_students')) {
    localStorage.setItem('ahe_students', JSON.stringify(MOCK_STUDENTS));
  }
  if (!localStorage.getItem('ahe_teachers')) {
    localStorage.setItem('ahe_teachers', JSON.stringify(MOCK_TEACHERS));
  }
  if (!localStorage.getItem('ahe_registrations')) {
    localStorage.setItem('ahe_registrations', JSON.stringify(MOCK_REGISTRATIONS));
  }
};
