import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eglbdqjpfdljnkcivfdf.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey || 'placeholder');

// Type helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Convenience type aliases
export type Student = Tables<'students'>;
export type Teacher = Tables<'teachers'>;
export type Registration = Tables<'registrations'>;
export type ClassRecord = Tables<'classes'>;
export type StudentAttendance = Tables<'student_attendance'>;
export type TeacherAttendance = Tables<'teacher_attendance'>;
export type Achievement = Tables<'achievements'>;
export type Evaluation = Tables<'evaluations'>;
export type Graduation = Tables<'graduations'>;
export type PaymentBill = Tables<'payment_bills'>;
export type PaymentTransaction = Tables<'payment_transactions'>;
export type SavingsAccount = Tables<'savings_accounts'>;
export type SavingsTransaction = Tables<'savings_transactions'>;
export type PointTransaction = Tables<'point_transactions'>;
export type StudentPoints = Tables<'student_points'>;
export type Merchandise = Tables<'merchandise'>;
export type PointRedemption = Tables<'point_redemptions'>;
export type LeaveRequest = Tables<'leave_requests'>;
export type WaNotification = Tables<'wa_notifications'>;
export type StudentLes = Tables<'student_les'>;
export type Profile = Tables<'profiles'>;
export type PaymentType = Tables<'payment_types'>;
export type ClassMember = Tables<'class_members'>;
