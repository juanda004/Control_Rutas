"use client";

import { useMemo, useEffect, useState } from 'react';
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
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();
    const firestore = useFirestore();
    const { user, isUserLoading: isUserLoadingAuth } = useUser();
    const { isAdmin, isLoading: isAdminLoading } = useAdmin();

    const isUserLoading = isUserLoadingAuth || isAdminLoading;

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted && !isUserLoadingAuth && !user) {
            router.replace('/');
        }
    }, [isMounted, user, isUserLoadingAuth, router]);

    const driversQuery = useMemoFirebase(() => {
        if (!firestore || !user || !isAdmin) return null;
        return collection(firestore, 'drivers');
    }, [firestore, user, isAdmin]);

    const { data: drivers, isLoading: driversLoading } = useCollection<Driver>(driversQuery);

    const sortedDrivers = useMemo(() => {
        if (!drivers) return [];
        return [...drivers].sort((a, b) => a.name.localeCompare(b.name));
    }, [drivers]);

    if (!isMounted || isUserLoading) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center" suppressHydrationWarning>
                <p className="animate-pulse">Cargando administrador...</p>
            </div>
        )
    }

    if (!user) return null;

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-background text-foreground" suppressHydrationWarning>
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
                            No tienes permisos de administrador asignados para el UID:
                        </p>
                        <code className="mt-2 block bg-muted p-2 rounded text-xs">{user.uid}</code>
                         <Button asChild className="mt-8">
                            <Link href="/dashboard">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver al Dashboard
                            </Link>
                        </Button>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground" suppressHydrationWarning>
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