
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PlusCircle, Calendar as CalendarIcon } from "lucide-react";
import Link from 'next/link';

import { type Driver, type RouteLog, type RouteLogWithDriver, type Sede } from "@/app/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AddRouteLogForm, type AddRouteLogFormValues } from "@/components/add-route-log-form";
import { RouteLogCard } from "@/components/route-log-card";
import { Logo } from "@/components/icons";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc } from "firebase/firestore";
import { AuthButton } from "@/components/auth-button";
import { DownloadReport } from "@/components/download-report";
import { useAdmin } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function DashboardPage() {
  const [isAddLogOpen, setAddLogOpen] = useState(false);
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading: isUserLoadingAuth } = useUser();
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSede, setSelectedSede] = useState<Sede | null>(null);
  
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  const isUserLoading = isUserLoadingAuth || isAdminLoading;

  useEffect(() => {
    if (!isUserLoadingAuth && !user) {
        router.replace('/');
    }
  }, [isUserLoadingAuth, user, router]);
  
  useEffect(() => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
  }, []);
  
  const handleSedeSelect = (sede: Sede) => {
    setSelectedSede(sede);
  };

  const driversQuery = useMemoFirebase(() => {
    if (firestore && !isUserLoading) {
      return collection(firestore, 'drivers');
    }
    return null;
  }, [firestore, isUserLoading]);
  const { data: drivers, isLoading: driversLoading } = useCollection<Driver>(driversQuery);

  const routeLogsQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'routeLogs') : null, [firestore, user]);
  const { data: allLogs, isLoading: logsLoading } = useCollection<RouteLog>(routeLogsQuery);

  const selectedDateStr = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);
  const selectedDateFormatted = useMemo(() => format(selectedDate, "eeee, d 'de' MMMM 'de' yyyy", {
      locale: es,
    }), [selectedDate]);

  const filteredLogs = useMemo(() => {
    if (!allLogs || !drivers) return [];
    
    let logsForDate = allLogs.filter((log) => log.logDate === selectedDateStr);

    if (!isAdmin && selectedSede) {
      logsForDate = logsForDate.filter(log => log.sede === selectedSede);
    } else if (isAdmin && selectedSede) {
      logsForDate = logsForDate.filter(log => log.sede === selectedSede);
    }

    return logsForDate.map((log) => ({
      ...log,
      driver: drivers.find((d) => d.id === log.driverId),
    }));
  }, [allLogs, drivers, selectedDateStr, isAdmin, selectedSede]);


  const handleAddLog = (newLogData: AddRouteLogFormValues) => {
    if (!firestore || !user || !drivers) return;

    const sedeForNewLog = isAdmin ? newLogData.sede : selectedSede;
    if (!sedeForNewLog) {
      console.error("No Sede selected for new log");
      return;
    }

    const selectedDriver = drivers.find(d => d.id === newLogData.driverId);
    if (!selectedDriver) return;
    
    const newLog: Omit<RouteLog, 'id'> = {
      driverId: newLogData.driverId,
      routeNumber: selectedDriver.routeNumber,
      licensePlate: selectedDriver.licensePlate,
      logDate: selectedDateStr,
      sede: sedeForNewLog,
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

  const isLoading = logsLoading || driversLoading || isUserLoading;

  if (isLoading || !user) {
    return (
         <div className="min-h-screen bg-background flex items-center justify-center">
            <p>Cargando...</p>
        </div>
    );
  }

  if (!isAdmin && !selectedSede) {
    return (
       <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
           <Card className="w-full max-w-md">
               <CardHeader>
                   <CardTitle>Seleccionar Sede</CardTitle>
                   <CardDescription>
                       Por favor, elige la sede en la que trabajarás hoy para continuar.
                   </CardDescription>
               </CardHeader>
               <CardContent className="flex flex-col sm:flex-row gap-4 justify-around pt-4">
                   <Button onClick={() => handleSedeSelect("Preescolar")} size="lg" className="w-full">Preescolar</Button>
                   <Button onClick={() => handleSedeSelect("Bachillerato")} size="lg" className="w-full">Bachillerato</Button>
               </CardContent>
           </Card>
       </div>
    )
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
                  <DownloadReport drivers={drivers} allLogs={allLogs} isAdmin={isAdmin} selectedSede={selectedSede} />
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
                          Selecciona el conductor para crear un nuevo registro para la fecha seleccionada.
                        </DialogDescription>
                      </DialogHeader>
                      <AddRouteLogForm onAddLog={handleAddLog} drivers={activeDrivers} isAdmin={isAdmin} />
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
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div >
              <h2 className="text-xl font-semibold text-gray-700 capitalize h-7">
                {selectedDateFormatted || '...'}
              </h2>
              <p className="text-muted-foreground">
                {filteredLogs.length > 0
                  ? `Siguiendo ${filteredLogs.length} ruta(s)${isAdmin && selectedSede ? ` en ${selectedSede}` : !isAdmin && selectedSede ? ` en ${selectedSede}`: ''}.`
                  : `No hay rutas para seguir en esta fecha${isAdmin && selectedSede ? ` en ${selectedSede}` : !isAdmin && selectedSede ? ` en ${selectedSede}`: ''}.`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Sede:</span>
                    <Select value={selectedSede || 'todas'} onValueChange={(value) => setSelectedSede(value === 'todas' ? null : value as Sede)}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Seleccionar sede" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todas">Todas</SelectItem>
                            <SelectItem value="Preescolar">Preescolar</SelectItem>
                            <SelectItem value="Bachillerato">Bachillerato</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              )}
               <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full sm:w-[240px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "d 'de' MMMM, yyyy", { locale: es }) : <span>Elige una fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => setSelectedDate(date || new Date())}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {filteredLogs.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredLogs.map((log) => (
              <RouteLogCard key={log.id} log={log} onUpdate={handleUpdateLog} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-lg font-medium text-gray-800">
              No se han encontrado registros
            </h3>
            <p className="text-muted-foreground mt-1">
              { user ? 'Intenta con otra fecha o añade un nuevo registro.' : 'Inicia sesión para ver y añadir registros de ruta.'}
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
