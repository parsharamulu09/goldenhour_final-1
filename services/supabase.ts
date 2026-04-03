
import { UserProfile, Role } from '../types';

// Functional mock for Supabase behaviors
export const mockAuth = {
  getUser: (): UserProfile | null => {
    const data = localStorage.getItem('gh_user');
    return data ? JSON.parse(data) : null;
  },
  signIn: (email: string, role: Role): UserProfile | null => {
    const registry = JSON.parse(localStorage.getItem('gh_registry') || '{}');
    const stored = registry[email];
    
    if (stored && stored.role === role) {
      const sessionUser = { id: stored.id, email: stored.email, role: stored.role, name: stored.name };
      localStorage.setItem('gh_user', JSON.stringify(sessionUser));
      return sessionUser;
    }
    return null;
  },
  signUp: (email: string, role: Role, name: string) => {
    const registry = JSON.parse(localStorage.getItem('gh_registry') || '{}');
    const newUser = { id: Math.random().toString(36).substr(2, 9), email, role, name };
    registry[email] = newUser;
    localStorage.setItem('gh_registry', JSON.stringify(registry));
    return true;
  },
  signOut: () => {
    localStorage.removeItem('gh_user');
  }
};

export const mockStorage = {
  uploadFile: async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
};
