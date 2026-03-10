
"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useAuth, useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/icons";

const formSchema = z.object({
  email: z.string().email({ message: "Introduce un email válido." }),
  password: z.string().min(1, { message: "La contraseña es obligatoria." }),
});

export default function LoginPage() {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isUserLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router, isMounted]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "Bienvenido",
        description: "Acceso concedido.",
      });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Credenciales incorrectas.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Evitar parpadeo de hidratación: no renderizar nada hasta que el cliente esté listo
  if (!isMounted) return null;

  // Si ya hay usuario, no mostramos el formulario mientras redirige
  if (user) return null;

  return (
    <main className="flex items-center justify-center min-h-screen bg-background p-4" suppressHydrationWarning>
      <Card className="w-full max-w-md shadow-xl border-primary/10">
        <CardHeader className="text-center">
          <Logo className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold tracking-tight">TrackRuta</CardTitle>
          <CardDescription>
            Acceso al panel de gestión.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="tu@email.com"
                        className="bg-muted/30"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="bg-muted/30"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-end text-sm">
                <Link
                  href="/forgot-password"
                  className="text-primary hover:underline font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Button type="submit" className="w-full h-11 font-bold shadow-lg" disabled={isSubmitting}>
                {isSubmitting ? "Accediendo..." : "Iniciar Sesión"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-primary hover:underline font-bold">
              Registrarse
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
