
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PlusCircle, Calendar as CalendarIcon, MapPin, ArrowUpDown, Loader2 } from "lucide-react";
import Link from 'next/link';

import { type Driver, type RouteLog, type Sede } from "@/app/lib/types";
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
import { collection, doc, query, where } from "firebase/firestore";
import { AuthButton } from "@/components/auth-button";
import { DownloadReport } from "@/components/download-report";
import { useAdmin } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type SortOption = "route" | "driver" | "time";

export default function DashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isAddLogOpen, setAddLogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("route");
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  const { toast } = useToast();
  
  const [selectedSede, setSelectedSede] = useState<Sede | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isUserLoading && !user) {
        router.replace('/');
    }
  }, [isMounted, isUserLoading, user, router]);

  const selectedDateStr = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);
  const selectedDateFormatted = useMemo(() => format(selectedDate, "eeee, d 'de' MMMM 'de' yyyy", {
      locale: es,
    }), [selectedDate]);

  // OPTIMIZACIÓN: Solo descargamos los conductores activos para agilizar la carga inicial
  const driversQuery = useMemoFirebase(() => {
    if (firestore && user) {
      return collection(firestore, 'drivers');
    }
    return null;
  }, [firestore, user]);

  const { data: drivers, isLoading: driversLoading } = useCollection<Driver>(driversQuery);

  // OPTIMIZACIÓN CRÍTICA: Solo descargamos los logs de la fecha seleccionada. 
  // Esto evita descargar miles de registros históricos innecesariamente.
  const routeLogsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !selectedDateStr) return null;
    return query(collection(firestore, 'routeLogs'), where('logDate', '==', selectedDateStr));
  }, [firestore, user, selectedDateStr]);
  
  const { data: currentDayLogs, isLoading: logsLoading } = useCollection<RouteLog>(routeLogsQuery);

  const isLoadingData = !isMounted || isUserLoading || driversLoading || logsLoading || isAdminLoading;

  const filteredAndSortedLogs = useMemo(() => {
    if (!currentDayLogs || !drivers) return [];
    
    let filtered = [...currentDayLogs];

    if (selectedSede) {
      filtered = filtered.filter(log => log.sede === selectedSede);
    }

    let logsWithDrivers = filtered.map((log) => ({
      ...log,
      driver: drivers.find((d) => d.id === log.driverId),
    }));

    return logsWithDrivers.sort((a, b) => {
      if (sortBy === "route") {
        return a.routeNumber.localeCompare(b.routeNumber, undefined, { numeric: true });
      } else if (sortBy === "driver") {
        const nameA = a.driver?.name || "";
        const nameB = b.driver?.name || "";
        return nameA.localeCompare(nameB);
      } else if (sortBy === "time") {
        const timeA = a.morningCheckIn || 0;
        const timeB = b.morningCheckIn || 0;
        return timeB - timeA;
      }
      return 0;
    });
  }, [currentDayLogs, drivers, selectedSede, sortBy]);

  const handleAddLog = (newLogData: AddRouteLogFormValues) => {
    if (!firestore || !user || !drivers) return;

    const sedeForNewLog = isAdmin ? newLogData.sede : selectedSede;
    if (!sedeForNewLog) return;

    let addedCount = 0;
    newLogData.driverIds.forEach(driverId => {
      const selectedDriver = drivers.find(d => d.id === driverId);
      if (!selectedDriver) return;

      const exists = currentDayLogs?.some(l => l.driverId === driverId && l.sede === sedeForNewLog);
      
      if (!exists) {
        const newLog: Omit<RouteLog, 'id'> = {
          driverId: driverId,
          routeNumber: selectedDriver.routeNumber,
          licensePlate: selectedDriver.licensePlate,
          logDate: selectedDateStr,
          sede: sedeForNewLog,
          morningObservations: newLogData.morningObservations
        };
        addDocumentNonBlocking(collection(firestore, 'routeLogs'), newLog);
        addedCount++;
      }
    });

    toast({
      title: "Registros procesados",
      description: `Se han añadido ${addedCount} nuevos registros.`,
    });
    
    setAddLogOpen(false);
  };

  const handleUpdateLog = (updatedLog: RouteLog) => {
    if (!firestore) return;
    const { id, ...logData } = updatedLog;
    updateDocumentNonBlocking(doc(firestore, 'routeLogs', id), logData);
  };

  const activeDrivers = useMemo(() => drivers?.filter(d => d.isActive) || [], [drivers]);

  if (!isMounted) return null;

  if (!user && !isUserLoading) return null;

  if (!isAdmin && !selectedSede && !isLoadingData) {
    return (
       <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex items-center justify-center p-4" suppressHydrationWarning>
           <Card className="w-full max-w-md shadow-2xl border-primary/10">
               <CardHeader className="text-center space-y-4">
                   <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                    <MapPin className="h-8 w-8 text-primary" />
                   </div>
                   <CardTitle className="text-2xl font-bold">Seleccionar Sede</CardTitle>
                   <CardDescription>
                       Elige la sede en la que realizarás los registros hoy.
                   </CardDescription>
               </CardHeader>
               <CardContent className="flex flex-col gap-4 pt-4">
                   <Button 
                    onClick={() => setSelectedSede("Preescolar")} 
                    size="lg" 
                    className="w-full h-16 text-lg font-bold shadow-lg transition-transform hover:scale-[1.02]"
                    variant="outline"
                   >
                    Sede Preescolar
                   </Button>
                   <Button 
                    onClick={() => setSelectedSede("Bachillerato")} 
                    size="lg" 
                    className="w-full h-16 text-lg font-bold shadow-lg transition-transform hover:scale-[1.02]"
                    variant="outline"
                   >
                    Sede Bachillerato
                   </Button>
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
              <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
                TrackRuta
              </h1>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <DownloadReport drivers={drivers} allLogs={currentDayLogs} isAdmin={isAdmin} selectedSede={selectedSede} />
              <Dialog open={isAddLogOpen} onOpenChange={setAddLogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={isLoadingData} size="sm" className="shadow-md">
                    <PlusCircle className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Nuevo Registro</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[450px]">
                  <DialogHeader>
                    <DialogTitle>Añadir Registros</DialogTitle>
                    <DialogDescription>
                      Selecciona los conductores para el día {selectedDateFormatted}.
                    </DialogDescription>
                  </DialogHeader>
                  <AddRouteLogForm onAddLog={handleAddLog} drivers={activeDrivers} isAdmin={isAdmin} />
                </DialogContent>
              </Dialog>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-gray-800 capitalize mb-2">
                {selectedDateFormatted || 'Cargando...'}
              </h2>
              <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                {selectedSede ? `Sede: ${selectedSede}` : "Todas las Sedes"}
              </Badge>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 bg-card border rounded-md px-3 h-10 shadow-sm border-primary/10">
                <ArrowUpDown className="h-4 w-4 text-primary shrink-0" />
                <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
                  <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0 w-[140px] p-0 h-auto font-medium">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="route">Nº Ruta</SelectItem>
                    <SelectItem value="driver">Conductor</SelectItem>
                    <SelectItem value="time">Hora Inicio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isAdmin && (
                <Select value={selectedSede || 'todas'} onValueChange={(value) => setSelectedSede(value === 'todas' ? null : value as Sede)}>
                    <SelectTrigger className="w-full sm:w-[150px] bg-white shadow-sm border-primary/10 font-medium">
                        <SelectValue placeholder="Sede" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todas">Todas</SelectItem>
                        <SelectItem value="Preescolar">Preescolar</SelectItem>
                        <SelectItem value="Bachillerato">Bachillerato</SelectItem>
                    </SelectContent>
                </Select>
              )}

               <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full sm:w-[200px] justify-start text-left font-normal bg-white shadow-sm border-primary/10 font-medium",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    {selectedDate ? format(selectedDate, "dd/MM/yyyy") : <span>Fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {isLoadingData ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-muted-foreground font-medium">Sincronizando registros...</p>
          </div>
        ) : filteredAndSortedLogs.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedLogs.map((log) => (
              <RouteLogCard key={log.id} log={log} onUpdate={handleUpdateLog} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border-2 border-dashed rounded-2xl bg-muted/5 space-y-4">
            <div className="mx-auto bg-muted p-4 rounded-full w-fit">
              <CalendarIcon className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">No hay registros</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">Cambia la fecha o crea un nuevo registro para comenzar.</p>
          </div>
        )}
      </main>
      <footer className="py-8 border-t bg-muted/20 mt-12">
        <div className="container mx-auto px-4 text-center">
            <p className="text-xs font-medium text-muted-foreground">© {new Date().getFullYear()} TrackRuta - Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
