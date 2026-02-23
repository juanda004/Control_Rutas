
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PlusCircle } from "lucide-react";
import Link from 'next/link';

import { type Driver, type RouteLog, type RouteLogWithDriver } from "@/app/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddRouteLogForm, type AddRouteLogFormValues } from "@/components/add-route-log-form";
import { RouteLogCard } from "@/components/route-log-card";
import { Logo } from "@/components/icons";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc } from "firebase/firestore";
import { AuthButton } from "@/components/auth-button";
import { DownloadReport } from "@/components/download-report";

export default function DashboardPage() {
  const [isAddLogOpen, setAddLogOpen] = useState(false);
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [todayStr, setTodayStr] = useState('');
  const [todayFormatted, setTodayFormatted] = useState('');
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    if (!isUserLoading && !user) {
        router.replace('/');
    }
  }, [isUserLoading, user, router]);

  useEffect(() => {
    const now = new Date();
    setTodayStr(format(now, "yyyy-MM-dd"));
    setTodayFormatted(format(now, "eeee, d 'de' MMMM 'de' yyyy", {
      locale: es,
    }));
    setCurrentYear(now.getFullYear());
  }, []);

  const driversQuery = useMemoFirebase(() => {
    if (firestore && !isUserLoading) {
      return collection(firestore, 'drivers');
    }
    return null;
  }, [firestore, isUserLoading]);
  const { data: drivers, isLoading: driversLoading } = useCollection<Driver>(driversQuery);

  const routeLogsQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'routeLogs') : null, [firestore, user]);
  const { data: allLogs, isLoading: logsLoading } = useCollection<RouteLog>(routeLogsQuery);

  const todayLogs = useMemo(() => {
    if (!allLogs || !drivers || !todayStr) return [];
    return allLogs
      .filter((log) => log.logDate === todayStr)
      .map((log) => ({
        ...log,
        driver: drivers.find((d) => d.id === log.driverId),
      }));
  }, [allLogs, drivers, todayStr]);


  const handleAddLog = (newLogData: AddRouteLogFormValues) => {
    if (!firestore || !user || !drivers) return;

    const selectedDriver = drivers.find(d => d.id === newLogData.driverId);
    if (!selectedDriver) return;
    
    const newLog: Omit<RouteLog, 'id'> = {
      driverId: newLogData.driverId,
      routeNumber: selectedDriver.routeNumber,
      licensePlate: selectedDriver.licensePlate,
      logDate: todayStr,
      morningObservations: newLogData.morningObservations
    };
    addDocumentNonBlocking(collection(firestore, 'routeLogs'), newLog);
    setAddLogOpen(false);
  };

  const handleUpdateLog = (updatedLog: RouteLog) => {
    if (!firestore) return;
    const { id, driver, ...logData } = updatedLog as RouteLogWithDriver;
    updateDocumentNonBlocking(doc(firestore, 'routeLogs', id), logData);
  };

  const activeDrivers = useMemo(() => drivers?.filter(d => d.isActive) || [], [drivers]);

  const isLoading = logsLoading || driversLoading || !todayStr || isUserLoading || !user;

  if (isLoading) {
    return (
         <div className="min-h-screen bg-background flex items-center justify-center">
            <p>Cargando...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 w-full bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Logo className="h-8 w-8 text-primary" />
              <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight font-headline">
                TrackRuta
              </h1>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              {user && (
                <>
                  <DownloadReport drivers={drivers} allLogs={allLogs} />
                  <Dialog open={isAddLogOpen} onOpenChange={setAddLogOpen}>
                    <DialogTrigger asChild>
                      <Button disabled={driversLoading} size="sm" className="sm:size-auto">
                        <PlusCircle className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Añadir Registro</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Añadir Nuevo Registro de Ruta</DialogTitle>
                        <DialogDescription>
                          Selecciona el conductor para crear un nuevo registro para hoy.
                        </DialogDescription>
                      </DialogHeader>
                      <AddRouteLogForm onAddLog={handleAddLog} drivers={activeDrivers} />
                    </DialogContent>
                  </Dialog>
                </>
              )}
              <AuthButton />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700 capitalize h-7">
            {todayFormatted || '...'}
          </h2>
          <p className="text-muted-foreground">
            {todayLogs.length > 0
              ? `Siguiendo ${todayLogs.length} ruta(s).`
              : "No hay rutas para seguir hoy."}
          </p>
        </div>
        {todayLogs.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {todayLogs.map((log) => (
              <RouteLogCard key={log.id} log={log} onUpdate={handleUpdateLog} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-lg font-medium text-gray-800">
              No se han añadido rutas todavía
            </h3>
            <p className="text-muted-foreground mt-1">
              { user ? 'Haz clic en "Añadir Registro" para empezar.' : 'Inicia sesión para añadir registros de ruta.'}
            </p>
          </div>
        )}
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground">
        <p>© {currentYear || ''} TrackRuta. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
