import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { appError } from "@/lib/error-codes";
import { Loader2, Pizza } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Check URL hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return "A senha deve ter no mínimo 8 caracteres";
    if (!/[a-zA-Z]/.test(pw)) return "A senha deve conter pelo menos uma letra";
    if (!/[0-9]/.test(pw)) return "A senha deve conter pelo menos um número";
    return null;
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validatePassword(password);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (password !== confirmPassword) {
      appError("ERR-AUTH-003");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha redefinida com sucesso!");
      navigate("/");
    } catch (error: any) {
      appError("ERR-AUTH-006", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 pointer-events-none" />

      <div className="w-full max-w-sm space-y-6 relative z-10 fade-up">
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
            <Pizza size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Redefinir Senha</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Digite sua nova senha abaixo</p>
        </div>

        <div className="bg-card p-8 rounded-md border border-border shadow-card">
          {isRecovery ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres (letras e números)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 bg-card border-border focus:border-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-11 bg-card border-border focus:border-primary/50"
                />
              </div>
              <Button type="submit" className="w-full h-11 font-semibold shadow-button" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Redefinir Senha"}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Link de recuperação inválido ou expirado. Solicite um novo link na página de login.
              </p>
              <Button className="w-full" onClick={() => navigate("/login")}>
                Voltar para o login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
