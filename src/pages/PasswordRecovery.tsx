
import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

export default function PasswordRecovery() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      setSent(true);
      toast.success("Email de recuperação enviado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar email de recuperação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#C0392B] mb-2">Dom Corleone</h1>
          <p className="text-muted-foreground">Recuperar sua senha</p>
        </div>
        
        <div className="bg-card p-8 rounded-lg border shadow-sm">
          {!sent ? (
            <form onSubmit={handleRecovery} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Digite seu email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-[#C0392B] hover:bg-[#A93226]" 
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Enviar email de recuperação"}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm">Um link de recuperação foi enviado para o seu email.</p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Voltar para o login</Link>
              </Button>
            </div>
          )}
          
          <div className="mt-4">
            <Button variant="link" className="w-full text-muted-foreground hover:text-[#C0392B]" asChild>
              <Link to="/login" className="flex items-center justify-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar para o login
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
