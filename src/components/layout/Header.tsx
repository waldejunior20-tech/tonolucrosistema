
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
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
    <header className="h-16 border-b bg-card flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-[#C0392B]">Dom Corleone</h2>
        {profile?.business_name && (
          <span className="text-muted-foreground border-l pl-4 hidden sm:block">
            {profile.business_name}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span className="hidden sm:block">{user?.email}</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout}
          className="gap-2 border-[#C0392B] text-[#C0392B] hover:bg-[#C0392B] hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:block">Sair</span>
        </Button>
      </div>
    </header>
  );
}
