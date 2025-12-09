import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { useSession } from "@/lib/auth-client";
import axios from "axios";

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  username?: string;
  lastLogin?: Date;
}

interface UserContextType {
  user: User | null;
  updateUser: (user: Partial<User>) => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize user from session and fetch full profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session?.user) {
        try {
          const response = await axios.get("/api/user/profile");
          if (response.data.success) {
            setUser(response.data.user);
          }
        } catch (error) {
          console.error("Failed to fetch user profile:", error);
          // Fall back to session user if API fails
          setUser(session.user as User);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    fetchUserProfile();
  }, [session?.user]);

  const updateUser = useCallback((updatedData: Partial<User>) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      return { ...prevUser, ...updatedData };
    });
  }, []);

  return (
    <UserContext.Provider value={{ user, updateUser, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}
