"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PlusCircle, Calendar as CalendarIcon, MapPin } from "lucide-react";
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
import { Badge } from "@/components/ui/badge"
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
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading: isUserLoadingAuth } = useUser();
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  
  const [selectedSede, setSelectedSede] = useState<Sede | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  const isUserLoading = isUserLoadingAuth || isAdminLoading;

  useEffect(() => {
    setIsMounted(true);
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setSelectedDate(now);
  }, []);

  useEffect(() => {
    if (isMounted && !isUserLoadingAuth && !user) {
        router.replace('/');
    }
  }, [isMounted, isUserLoadingAuth, user, router]);
  
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

  const selectedDateStr = useMemo(() => selectedDate ? format(selectedDate, "yyyy-MM-dd") : '', [selectedDate]);
  const selectedDateFormatted = useMemo(() => selectedDate ? format(selectedDate, "eeee, d 'de' MMMM 'de' yyyy", {
      locale: es,
    }) : '', [selectedDate]);

  const filteredLogs = useMemo(() => {
    if (!allLogs || !drivers || !selectedDateStr) return [];
    
    let logsForDate = allLogs.filter((log) => log.logDate === selectedDateStr);

    if (selectedSede) {
      logsForDate = logsForDate.filter(log => log.sede === selectedSede);
    }

    return logsForDate.map((log) => ({
      ...log,
      driver: drivers.find((d) => d.id === log.driverId),
    }));
  }, [allLogs, drivers, selectedDateStr, selectedSede]);

  const handleAddLog = (newLogData: AddRouteLogFormValues) => {
    if (!firestore || !user || !drivers || !selectedDateStr) return;

    const sedeForNewLog = isAdmin ? newLogData.sede : selectedSede;
    if (!sedeForNewLog) return;

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

  const isLoading = logsLoading || driversLoading || isUserLoading || !selectedDate || !isMounted;

  if (isLoading || !user) {
    return (
         <div className="min-h-screen bg-background flex items-center justify-center">
            <p className="text-sm font-medium animate-pulse">Cargando aplicación...</p>
        </div>
    );
  }

  if (!isAdmin && !selectedSede) {
    return (
       <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center p-4" suppressHydrationWarning>
           <Card className="w-full max-w-md shadow-2xl border-primary/10">
               <CardHeader className="text-center space-y-4">
                   <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                    <MapPin className="h-8 w-8 text-primary" />
                   </div>
                   <CardTitle className="text-2xl font-bold">Seleccionar Sede</CardTitle>
                   <CardDescription>
                       Elige la sede en la que realizarás los registros de ruta durante esta sesión.
                   </CardDescription>
               </CardHeader>
               <CardContent className="flex flex-col gap-4 pt-4">
                   <Button 
                    onClick={() => handleSedeSelect("Preescolar")} 
                    size="lg" 
                    className="w-full h-16 text-lg font-bold shadow-lg transition-transform hover:scale-[1.02]"
                    variant="outline"
                   >
                    Preescolar
                   </Button>
                   <Button 
                    onClick={() => handleSedeSelect("Bachillerato")} 
                    size="lg" 
                    className="w-full h-16 text-lg font-bold shadow-lg transition-transform hover:scale-[1.02]"
                    variant="outline"
                   >
                    Bachillerato
                   </Button>
                   <p className="text-[10px] text-center text-muted-foreground mt-4">
                    Podrás cambiar de sede cerrando sesión e ingresando nuevamente o refrescando la página.
                   </p>
               </CardContent>
           </Card>
       </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background" suppressHydrationWarning>
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
                      <Button disabled={driversLoading} size="sm" className="sm:size-auto shadow-md">
                        <PlusCircle className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Nuevo Registro</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Añadir Nuevo Registro</DialogTitle>
                        <DialogDescription>
                          Selecciona el conductor para la fecha: {selectedDateFormatted}.
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
      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8" suppressHydrationWarning>
        <div className="mb-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-gray-800 capitalize leading-none mb-2">
                {selectedDateFormatted || '...'}
              </h2>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                  {selectedSede ? `Sede: ${selectedSede}` : "Todas las Sedes"}
                </Badge>
                <p className="text-sm text-muted-foreground font-medium">
                  {filteredLogs.length > 0
                    ? `Monitoreando ${filteredLogs.length} ruta(s)`
                    : `Sin rutas registradas para hoy`}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {isAdmin && (
                <div className="flex items-center gap-2 min-w-[180px]">
                    <Select value={selectedSede || 'todas'} onValueChange={(value) => setSelectedSede(value === 'todas' ? null : value as Sede)}>
                        <SelectTrigger className="w-full bg-white shadow-sm">
                            <SelectValue placeholder="Filtrar por sede" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todas">Todas las Sedes</SelectItem>
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
                      "w-full sm:w-[240px] justify-start text-left font-normal bg-white shadow-sm border-primary/10",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    {selectedDate ? format(selectedDate, "d 'de' MMMM, yyyy", { locale: es }) : <span>Elige una fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate || undefined}
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {filteredLogs.map((log) => (
              <RouteLogCard key={log.id} log={log} onUpdate={handleUpdateLog} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border-2 border-dashed rounded-2xl bg-muted/5 space-y-4">
            <div className="mx-auto bg-muted p-4 rounded-full w-fit">
              <CalendarIcon className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">
              No hay registros disponibles
            </h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
              { user ? 'Cambia la fecha o pulsa en "Nuevo Registro" para iniciar el seguimiento.' : 'Inicia sesión para gestionar las rutas.'}
            </p>
          </div>
        )}
      </main>
      <footer className="py-8 border-t bg-muted/20 mt-12">
        <div className="container mx-auto px-4 text-center">
            <p className="text-xs font-medium text-muted-foreground">
                © {currentYear || ''} TrackRuta. Herramienta de Gestión Logística Escolar.
            </p>
        </div>
      </footer>
    </div>
  );
}
