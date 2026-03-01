import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Moon, Sun, BarChart3, Users, Kanban, MessageSquare, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const LoginPage = () => {
  const { loginWithCredentials } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }
    
    setLoading(true);
    const result = await loginWithCredentials(email, password);
    setLoading(false);
    
    if (!result.success) {
      toast.error(result.error || 'Email ou senha incorretos');
    }
  };

  const features = [
    { icon: BarChart3, title: 'Dashboard Inteligente', desc: 'KPIs e métricas em tempo real' },
    { icon: Kanban, title: 'Kanban de Vendas', desc: 'Gerencie leads com drag-and-drop' },
    { icon: Users, title: 'Multi-tenant', desc: 'Gerencie múltiplas empresas' },
    { icon: MessageSquare, title: 'WhatsApp Integrado', desc: 'Evolution API integrada' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Features */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1583338850703-bc602b103674?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBvZmZpY2UlMjBhYnN0cmFjdCUyMGFyY2hpdGVjdHVyZSUyMGdsYXNzfGVufDB8fHx8MTc3MTkzMzYwM3ww&ixlib=rb-4.1.0&q=85)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/70" />
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <h1 className="font-outfit text-5xl font-bold mb-4">CRM SaaS</h1>
          <p className="text-xl text-white/80 mb-12">
            Gerencie suas vendas com eficiência
          </p>
          
          <div className="grid grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <div key={idx} className="glass p-4 rounded-xl bg-white/10 backdrop-blur-sm">
                <feature.icon className="w-8 h-8 mb-3" />
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-white/70">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex justify-end mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="theme-toggle"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>

          <Card className="border-0 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="font-outfit text-3xl">Bem-vindo</CardTitle>
              <CardDescription className="text-base">
                Entre com suas credenciais
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    data-testid="login-email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      data-testid="login-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                  data-testid="login-submit"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Contate o administrador para obter suas credenciais
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
