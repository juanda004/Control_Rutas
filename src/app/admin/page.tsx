
"use client";

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Driver } from '@/app/lib/types';
import { AdminDriverList } from '@/components/admin/admin-driver-list';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, ArrowUpDown, Settings2, Loader2 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Logo } from '@/components/icons';

export default function AdminPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [sortBy, setSortBy] = useState("name");
    const router = useRouter();
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const { isAdmin, isLoading: isAdminLoading } = useAdmin();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted && !isUserLoading && !user) {
            router.replace('/');
        }
    }, [isMounted, user, isUserLoading, router]);

    const driversQuery = useMemoFirebase(() => {
        if (!firestore || !user || !isAdmin) return null;
        return collection(firestore, 'drivers');
    }, [firestore, user, isAdmin]);

    const { data: drivers, isLoading: driversLoading } = useCollection<Driver>(driversQuery);

    const processedDrivers = useMemo(() => {
        if (!drivers) return [];
        let sorted = [...drivers];

        return sorted.sort((a, b) => {
            if (sortBy === "name") return a.name.localeCompare(b.name);
            if (sortBy === "route") return a.routeNumber.localeCompare(b.routeNumber, undefined, { numeric: true });
            if (sortBy === "plate") return a.licensePlate.localeCompare(b.licensePlate);
            return 0;
        });
    }, [drivers, sortBy]);

    if (!isMounted || (isUserLoading && !user)) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4" suppressHydrationWarning>
                <Logo className="h-16 w-16 text-primary animate-pulse mb-4" />
                <p className="text-muted-foreground font-medium animate-pulse">Verificando acceso...</p>
            </div>
        );
    }

    if (!user) return null;

    if (!isAdminLoading && !isAdmin) {
        return (
            <div className="min-h-screen bg-background text-foreground" suppressHydrationWarning>
                 <header className="sticky top-0 z-10 w-full bg-background/80 backdrop-blur-sm border-b">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <h1 className="text-xl font-bold text-primary">Panel Administrativo</h1>
                            <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground">
                                <ArrowLeft className="h-4 w-4" /> Volver
                            </Link>
                        </div>
                    </div>
                </header>
                <main className="container mx-auto p-8 flex items-center justify-center min-h-[60vh]">
                    <div className="text-center p-8 border-2 border-dashed rounded-lg max-w-2xl bg-card shadow-sm">
                        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
                        <h2 className="mt-4 text-xl font-semibold text-destructive">Acceso Restringido</h2>
                        <p className="mt-2 text-muted-foreground">Esta sección es exclusiva para administradores del sistema.</p>
                         <Button asChild className="mt-8">
                            <Link href="/dashboard">Volver al Dashboard</Link>
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
                        <div className="flex items-center gap-3">
                            <Settings2 className="h-6 w-6 text-primary" />
                            <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">Administración</h1>
                        </div>
                        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider">
                            <ArrowLeft className="h-4 w-4" /> Volver al Panel
                        </Link>
                    </div>
                </div>
            </header>
            <main className="container mx-auto p-4 sm:p-6 lg:p-8" suppressHydrationWarning>
                <div className="max-w-5xl mx-auto space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-primary/10 p-4 rounded-2xl shadow-sm">
                        <div className="text-sm text-muted-foreground font-medium">Gestiona la flota de conductores y la configuración de rutas.</div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="flex items-center gap-2 bg-white border rounded-md px-3 h-10 shadow-sm border-primary/10 w-full sm:w-auto">
                                <ArrowUpDown className="h-4 w-4 text-primary shrink-0" />
                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0 w-[140px] p-0 h-auto font-bold">
                                        <SelectValue placeholder="Ordenar por" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="name">Nombre</SelectItem>
                                        <SelectItem value="route">Nº Ruta</SelectItem>
                                        <SelectItem value="plate">Matrícula</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {driversLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-muted-foreground font-medium">Cargando conductores...</p>
                        </div>
                    ) : (
                        <AdminDriverList drivers={processedDrivers} />
                    )}
                </div>
            </main>
        </div>
    )
}
