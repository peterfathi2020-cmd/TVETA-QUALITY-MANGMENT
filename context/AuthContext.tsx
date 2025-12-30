
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Role } from '../types';
import { db } from '../services/firebase';
import { collection, doc, setDoc, query, where, getDocs } from 'firebase/firestore';

type Action = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'update_progress' | 'reset' | 'fill' | 'manage';
type Resource = 'visits' | 'auditors' | 'team' | 'reports' | 'forms' | 'system' | 'users';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signup: (data: Partial<User>) => Promise<string | null>; // Returns error string or null if success
  resetPassword: (email: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (action: Action, resource: Resource) => boolean;
  systemUsers: User[]; // Kept for interface compatibility but will fetch on demand or be empty
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_STORAGE_KEY = 'tveta_auth_user';

// Updated Admin Credentials as requested
const SPECIAL_ADMINS = [
  { email: 'peterfathi2020@gmail.com', password: 'pepo_1759', name: 'Peter Fathi (Admin)' },
  { email: 'sayedjica2016@gmail.com', password: '01200355618', name: 'Sayed Jica (Admin)' }
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Removed global systemUsers sync to improve performance and fix race conditions.
  // Instead, we verify credentials on demand.
  
  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // 1. Check Hardcoded Admins First (Fastest Path)
    const specialAdmin = SPECIAL_ADMINS.find(
      a => a.email.toLowerCase() === cleanEmail && a.password === cleanPass
    );

    if (specialAdmin) {
       const adminUser: User = {
         id: `admin_${cleanEmail}`,
         name: specialAdmin.name,
         email: specialAdmin.email,
         role: 'admin',
         password: specialAdmin.password 
       };
       setUser(adminUser);
       localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));
       return { success: true };
    }

    // 2. Check against Firestore (Direct Query)
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { success: false, message: 'البريد الإلكتروني غير مسجل في النظام.' };
      }

      let foundUser: User | null = null;
      
      // Check password manually since we are storing it in the doc (as per requirements)
      querySnapshot.forEach((doc) => {
        const userData = doc.data() as User;
        if (userData.password === cleanPass) {
          foundUser = userData;
        }
      });

      if (foundUser) {
        setUser(foundUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(foundUser));
        return { success: true };
      } else {
        return { success: false, message: 'كلمة المرور غير صحيحة.' };
      }

    } catch (error) {
      console.error("Login Error:", error);
      return { success: false, message: 'حدث خطأ في الاتصال بقاعدة البيانات.' };
    }
  };

  const signup = async (data: Partial<User>): Promise<string | null> => {
    const cleanEmail = data.email?.trim().toLowerCase();
    if (!cleanEmail) return "البريد الإلكتروني مطلوب";

    // Check if email is a special admin
    if (SPECIAL_ADMINS.find(a => a.email.toLowerCase() === cleanEmail)) {
        return "هذا البريد محجوز للإدارة العليا.";
    }

    try {
        // Check if email already exists in Firestore
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', cleanEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            return "البريد الإلكتروني مسجل بالفعل.";
        }

        const newId = `user_${Date.now()}`;
        
        // Strictly enforce 'auditor' role for public signups
        const newUser: User = {
            id: newId,
            name: data.name || 'User',
            email: cleanEmail,
            password: data.password || '',
            role: 'auditor', 
            governorate: (data as any).governorate || '',
            phone: (data as any).phone || '',
            specialization: (data as any).specialization || 'عام'
        } as User;

        // Create User in 'users' collection
        await setDoc(doc(db, 'users', newId), newUser);
        
        // Also create entry in 'auditors'
        await setDoc(doc(db, 'auditors', newId), {
            id: newId,
            name: newUser.name,
            governorate: (data as any).governorate,
            specialization: (data as any).specialization || 'عام',
            phone: (data as any).phone,
            status: 'Active',
            rating: 5
        });

        setUser(newUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
        return null; // Success
    } catch (e: any) {
      console.error(e);
      return "فشل إنشاء الحساب، يرجى المحاولة لاحقاً.";
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Simulate check
    try {
        // Check local admins
        if (SPECIAL_ADMINS.find(a => a.email.toLowerCase() === cleanEmail)) return true;

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', cleanEmail));
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    } catch {
        return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const hasPermission = (action: Action, resource: Resource): boolean => {
    if (!user) return false;
    
    if (user.role === 'admin') return true;

    const permissions: Record<string, Partial<Record<Resource, Action[]>>> = {
      sector_manager: {
        visits: ['view', 'create', 'edit'],
        auditors: ['view'],
        team: ['view'],
        reports: ['view', 'approve'],
        forms: ['view', 'fill'],
        system: []
      },
      auditor: {
        visits: ['view', 'update_progress'],
        auditors: [],
        team: [],
        reports: ['view', 'create', 'fill'],
        forms: ['view', 'fill'],
        system: []
      }
    };

    const rolePermissions = permissions[user.role];
    if (!rolePermissions) return false;

    const resourcePermissions = rolePermissions[resource];
    return resourcePermissions ? resourcePermissions.includes(action) : false;
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, resetPassword, logout, isAuthenticated: !!user, hasPermission, systemUsers: [] }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
