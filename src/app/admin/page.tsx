
"use client";
import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Driver } from '@/app/lib/types';
import { AdminDriverList } from '@/components/admin/admin-driver-list';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
    const router = useRouter();
    const firestore = useFirestore();
    const { user, isUserLoading: isUserLoadingAuth } = useUser();
    const { isAdmin, isLoading: isAdminLoading } = useAdmin();

    const isUserLoading = isUserLoadingAuth || isAdminLoading;

    useEffect(() => {
        if (!isUserLoadingAuth && !user) {
            router.replace('/');
        }
    }, [user, isUserLoadingAuth, router]);

    const driversQuery = useMemoFirebase(() => (firestore && user && isAdmin) ? collection(firestore, 'drivers') : null, [firestore, user, isAdmin]);
    const { data: drivers, isLoading: driversLoading } = useCollection<Driver>(driversQuery);

    const sortedDrivers = useMemo(() => {
        if (!drivers) return [];
        return [...drivers].sort((a, b) => a.name.localeCompare(b.name));
    }, [drivers]);

    const isLoading = driversLoading || isUserLoading;

    if (isLoading || !user) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <p>Verificando permisos...</p>
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                 <header className="sticky top-0 z-10 w-full bg-background/80 backdrop-blur-sm border-b">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <h1 className="text-xl sm:text-2xl font-bold text-primary">Panel de Administrador</h1>
                            <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                                <ArrowLeft className="h-4 w-4" />
                                Volver a la App
                            </Link>
                        </div>
                    </div>
                </header>
                <main className="container mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center" style={{minHeight: 'calc(100vh - 8rem)'}}>
                    <div className="text-center p-8 border-2 border-dashed rounded-lg max-w-2xl">
                        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
                        <h2 className="mt-4 text-xl font-semibold text-destructive">Acceso Denegado</h2>
                        <p className="mt-2 text-muted-foreground">
                            No tienes permisos de administrador. Para obtener acceso, sigue estos pasos:
                        </p>
    
                        <div className="mt-6 text-left bg-muted/50 p-4 rounded-lg text-sm">
                            <p className="font-semibold text-foreground">1. Obtén tu ID de Usuario:</p>
                            <p className="mt-1 text-muted-foreground">Tu ID de usuario único es:</p>
                            <code className="mt-1 block w-full truncate bg-background p-2 rounded-md text-center text-xs">{user ? user.uid : 'Cargando...'}</code>
                            
                            <p className="font-semibold text-foreground mt-4">2. Asigna el rol de administrador en Firebase:</p>
                            <ol className="list-decimal list-inside space-y-1 mt-1 text-muted-foreground">
                                <li>Abre la <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">Consola de Firebase</a> de tu proyecto.</li>
                                <li>En el menú de la izquierda, ve a <strong>Construir &gt; Firestore Database</strong>.</li>
                                <li>Haz clic en <strong>+ Iniciar colección</strong>.</li>
                                <li>Como ID de la colección, introduce <strong><code>roles_admin</code></strong>.</li>
                                <li>Haz clic en <strong>Siguiente</strong>.</li>
                                <li>Pega tu <strong>ID de Usuario</strong> que copiaste arriba en el campo <strong>ID del documento</strong>.</li>
                                <li>Puedes dejar los campos del documento vacíos. Haz clic en <strong>Guardar</strong>.</li>
                            </ol>
                            <p className="mt-4 text-xs text-center text-muted-foreground">Una vez que hayas creado el documento, actualiza esta página para acceder al panel.</p>
                        </div>
    
                         <Button asChild className="mt-8">
                            <Link href="/dashboard">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver a la página principal
                            </Link>
                        </Button>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-10 w-full bg-background/80 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <h1 className="text-xl sm:text-2xl font-bold text-primary">Panel de Administrador</h1>
                        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                            <ArrowLeft className="h-4 w-4" />
                            Volver a la App
                        </Link>
                    </div>
                </div>
            </header>
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    {driversLoading ? (
                        <p>Cargando conductores...</p>
                    ) : (
                        <AdminDriverList drivers={sortedDrivers} />
                    )}
                </div>
            </main>
        </div>
    )
}
