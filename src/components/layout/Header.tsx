import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User, Search, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Header() {
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
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {profile?.business_name && (
          <span className="text-sm font-semibold text-foreground">
            {profile.business_name}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-card border border-border rounded-sm px-3 py-2 w-[280px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
          />
        </div>

        <button
          onClick={() => navigate("/configuracoes")}
          className="p-2 rounded-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title="Configurações"
        >
          <Settings2 className="h-4 w-4" />
        </button>

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-9 h-9 rounded-full border-2 border-primary flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="hidden sm:block text-xs text-foreground">{user?.email}</span>
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
