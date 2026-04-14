import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User, Menu, Cog } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Header({ onMenuClick, showMenuButton }: HeaderProps) {
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
          .select("business_name, display_name")
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

  // Avatar initials
  const initials = (() => {
    const name = profile?.display_name || profile?.business_name || user?.email || "";
    const parts = name.split(/[\s@]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  })();

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors lg:hidden"
          >
            <Menu size={20} />
          </button>
        )}
        {profile?.business_name && (
          <span className="text-sm font-semibold text-foreground hidden sm:block">
            {profile.business_name}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/configuracoes")}
          className="p-2 rounded-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title="Configurações"
        >
          <Cog className="h-6 w-6" />
        </button>

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">{initials}</span>
          </div>
          <span className="hidden sm:block text-xs text-muted-foreground max-w-[140px] truncate">{user?.email}</span>
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout}
          className="h-8 text-muted-foreground hover:text-destructive text-xs gap-1.5"
        >
          <LogOut className="h-5 w-5" />
          <span className="hidden sm:block">Sair</span>
        </Button>
      </div>
    </header>
  );
}
