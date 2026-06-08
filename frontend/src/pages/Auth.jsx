import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { formatError } from "@/lib/api";
import { Sparkles } from "lucide-react";

export default function Auth({ mode = "login" }) {
  const isLogin = mode === "login";
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      if (isLogin) await login(email, password);
      else await register(email, password, name);
      nav("/");
    } catch (e2) {
      setErr(formatError(e2.response?.data?.detail) || e2.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background grain px-4">
      <Card className="w-full max-w-md p-8 shadow-sm" data-testid="auth-card">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-serif text-xl">Momentum</span>
        </div>
        <h1 className="font-serif text-3xl mb-1">{isLogin ? "Welcome back" : "Start your journey"}</h1>
        <p className="text-sm text-muted-foreground mb-6">{isLogin ? "Sign in to continue tracking." : "Create your account to begin."}</p>
        <form onSubmit={submit} className="space-y-4">
          {!isLogin && (
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" data-testid="auth-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" data-testid="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" data-testid="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          {err && <p className="text-sm text-destructive" data-testid="auth-error">{err}</p>}
          <Button type="submit" disabled={busy} className="w-full" data-testid="auth-submit">
            {busy ? "..." : isLogin ? "Sign in" : "Create account"}
          </Button>
        </form>
        <p className="text-sm text-center mt-5 text-muted-foreground">
          {isLogin ? "New here? " : "Have an account? "}
          <Link to={isLogin ? "/register" : "/login"} className="text-primary hover:underline" data-testid="auth-toggle">
            {isLogin ? "Create account" : "Sign in"}
          </Link>
        </p>
      </Card>
    </div>
  );
}
