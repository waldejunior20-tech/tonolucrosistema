import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User, Sun, Moon, Monitor } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/components/ThemeProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data } = await supabase
          .from("profiles")
          .select("business_name")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data);
      }
    }
    getProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {profile?.business_name && (
          <span className="text-sm font-medium text-foreground">
            {profile.business_name}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              {theme === "light" ? (
                <Sun className="h-4 w-4" />
              ) : theme === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" /> Claro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" /> Escuro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="mr-2 h-4 w-4" /> Automático
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="hidden sm:block text-xs">{user?.email}</span>
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout}
          className="h-8 text-muted-foreground hover:text-destructive text-xs gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:block">Sair</span>
        </Button>
      </div>
    </header>
  );
}
