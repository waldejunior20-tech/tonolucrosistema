
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Signup() {
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            business_name: businessName,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Erro ao criar usuário");

      // Save business name to profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([{ id: data.user.id, business_name: businessName }]);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        // We'll proceed anyway as the user is created
      }

      toast.success("Conta criada com sucesso! Redirecionando para onboarding...");
      navigate("/onboarding");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#C0392B] mb-2">Dom Corleone</h1>
          <p className="text-muted-foreground">Crie sua conta no sistema</p>
        </div>
        <form onSubmit={handleSignup} className="space-y-4 bg-card p-8 rounded-lg border shadow-sm text-left">
          <div className="space-y-2">
            <Label htmlFor="businessName">Nome do estabelecimento</Label>
            <Input
              id="businessName"
              placeholder="Ex: Pizzaria do Chef"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-[#C0392B] hover:bg-[#A93226]" 
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Criar conta"}
          </Button>
          <div className="text-center mt-4">
            <span className="text-sm text-muted-foreground">Já tem uma conta? </span>
            <Link to="/login" className="text-sm text-[#C0392B] hover:underline font-medium">
              Fazer login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
