import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Menu } from "lucide-react";

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  sidebarWidth?: string;
}

export function Header({ onMenuClick, showMenuButton, sidebarWidth = "0px" }: HeaderProps) {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
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

  return (
    <header style={{ left: sidebarWidth }} className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 fixed top-0 right-0 z-30 transition-all duration-300">
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
    </header>
  );
}
