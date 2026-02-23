'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function DeprecatedLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
       <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Página no encontrada</CardTitle>
          <CardDescription>
            Esta dirección de inicio de sesión ya no está en uso.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Ir a la página principal
              </Link>
            </Button>
        </CardContent>
      </Card>
    </main>
  );
}
