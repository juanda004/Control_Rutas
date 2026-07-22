
"use client";

import { useState, useEffect } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, CalendarIcon, FileSpreadsheet, Loader2, Search, MapPin } from 'lucide-react';
import { type Driver, type RouteLog, type Sede } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRange } from "react-day-picker";
import { cn } from '@/lib/utils';
import { collection, getDocs, query, where, Firestore } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from '@/components/ui/label';

interface DownloadReportProps {
  firestore: Firestore;
  drivers: Driver[] | null;
  isAdmin: boolean;
  dashboardSede: Sede | null;
  datesWithData?: Date[];
}

export function DownloadReport({ firestore, drivers, isAdmin, dashboardSede, datesWithData = [] }: DownloadReportProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Filtros internos del reporte
  const [reportSede, setReportSede] = useState<Sede | 'Todas'>('Todas');
  const [routeFilter, setRouteFilter] = useState("");

  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setIsClient(true);
    const now = new Date();
    setToday(now);
    setDateRange({ from: now, to: now });
    // Inicializar la sede del reporte con la sede actual del dashboard
    setReportSede(dashboardSede || 'Todas');
  }, [dashboardSede]);

  const handleDownload = async () => {
    if (!drivers || !dateRange || !dateRange.from || !firestore) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor, selecciona un rango de fechas válido.",
      });
      return;
    }

    setIsDownloading(true);
    try {
      const startDate = startOfDay(dateRange.from);
      const endDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Consultar registros para el rango de fechas específico
      const q = query(
        collection(firestore, 'routeLogs'),
        where('logDate', '>=', startDateStr),
        where('logDate', '<=', endDateStr)
      );
      
      const querySnapshot = await getDocs(q);
      let logsInRange: RouteLog[] = querySnapshot.docs.map(doc => ({ 
        ...doc.data() as RouteLog, 
        id: doc.id 
      }));

      // Aplicar filtro de sede del reporte
      if (reportSede !== 'Todas') {
        logsInRange = logsInRange.filter(log => log.sede === reportSede);
      }

      // Aplicar filtro de rutas si existe
      if (routeFilter.trim()) {
        const routes = routeFilter.toLowerCase().split(',').map(r => r.trim()).filter(r => r !== "");
        if (routes.length > 0) {
          logsInRange = logsInRange.filter(log => 
            routes.some(route => log.routeNumber.toLowerCase().includes(route))
          );
        }
      }

      if (logsInRange.length === 0) {
        toast({
          title: "Sin datos",
          description: "No hay registros que coincidan con los criterios seleccionados.",
        });
        setIsDownloading(false);
        return;
      }

      // Ordenar resultados cronológicamente, por sede y por ruta
      logsInRange.sort((a, b) => {
          if (a.logDate !== b.logDate) return a.logDate.localeCompare(b.logDate);
          if (a.sede !== b.sede) return a.sede.localeCompare(b.sede);
          return a.routeNumber.localeCompare(b.routeNumber, undefined, { numeric: true });
      });

      const dataToExport = logsInRange.map(log => {
        const driver = drivers.find(d => d.id === log.driverId);
        const formatTimestamp = (ts: number | undefined) => ts ? format(new Date(ts), 'HH:mm:ss') : '';
        
        return {
          'Fecha': log.logDate,
          'Sede': log.sede,
          'Conductor': driver?.name || 'Desconocido',
          'Nº Ruta': log.routeNumber,
          'Matrícula': log.licensePlate,
          'Check-In Mañana': formatTimestamp(log.morningCheckIn),
          'Check-Out Mañana': formatTimestamp(log.morningCheckOut),
          'Firma Mañana': log.morningSignature ? 'Firmado' : '',
          'Obs. Mañana': log.morningObservations || '',
          'Check-In Tarde': formatTimestamp(log.afternoonCheckIn),
          'Check-Out Tarde': formatTimestamp(log.afternoonCheckOut),
          'Firma Tarde': log.afternoonSignature ? 'Firmado' : '',
          'Obs. Tarde': log.afternoonObservations || '',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Registros');
      
      // Ajustar anchos de columna
      const cols = Object.keys(dataToExport[0]).map(() => ({ wch: 18 }));
      worksheet["!cols"] = cols;

      const rangeStr = dateRange.to && format(dateRange.from, 'yyyy-MM-dd') !== format(dateRange.to, 'yyyy-MM-dd')
          ? `${format(dateRange.from, 'yyyyMMdd')}_a_${format(dateRange.to, 'yyyyMMdd')}`
          : format(dateRange.from, 'yyyyMMdd');

      XLSX.writeFile(workbook, `Reporte_TrackRuta_${rangeStr}.xlsx`);
      setIsPopoverOpen(false);
      
      toast({
        title: "Reporte generado",
        description: "El archivo Excel se ha descargado correctamente.",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al generar el reporte.",
      });
    } finally {
      setIsDownloading(false);
    }
  };
  
  if (!isClient) {
    return <Skeleton className="h-9 w-[175px]" />;
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/20 hover:border-primary/50 transition-colors">
          <Download className="h-4 w-4 sm:mr-2 text-primary" />
          <span className="hidden sm:inline">Descargar Reporte</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] sm:w-[420px] p-0 max-h-[85vh] flex flex-col overflow-hidden" align="end">
        <div className="p-4 border-b text-center text-xs font-bold uppercase tracking-widest text-primary bg-primary/5 shrink-0">
            Configuración del Reporte
        </div>
        
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Selector de Rango de Fechas */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" /> 1. Rango de Fechas
            </Label>
            <div className="flex justify-center border rounded-xl p-2 bg-muted/10">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                initialFocus
                locale={es}
                numberOfMonths={1}
                disabled={(d) => d > (today || new Date())}
                className="border-0 shadow-none p-0"
                modifiers={{
                  hasData: datesWithData
                }}
                modifiersClassNames={{
                  hasData: "font-bold text-primary relative after:absolute after:bottom-[3px] after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:bg-primary aria-selected:after:bg-primary-foreground after:rounded-full"
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Selector de Sede */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> 2. Sede
              </Label>
              <Select value={reportSede} onValueChange={(val: any) => setReportSede(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Seleccionar Sede" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas">Todas las Sedes</SelectItem>
                  <SelectItem value="Preescolar">Preescolar</SelectItem>
                  <SelectItem value="Bachillerato">Bachillerato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Rutas */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Search className="h-3 w-3" /> 3. Rutas (Opcional)
              </Label>
              <Input 
                placeholder="Ej: 1, 2, 5" 
                value={routeFilter}
                onChange={(e) => setRouteFilter(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Resumen de Selección */}
          <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
            <div className="text-[9px] font-bold text-primary uppercase tracking-tighter mb-1">Periodo</div>
            {dateRange?.from ? (
              <div className="text-xs font-bold flex items-center gap-2">
                {format(dateRange.from, 'dd/MM/yyyy')}
                {dateRange.to && format(dateRange.from, 'yyyy-MM-dd') !== format(dateRange.to, 'yyyy-MM-dd') && (
                  <>
                    <span className="text-muted-foreground">→</span>
                    {format(dateRange.to, 'dd/MM/yyyy')}
                  </>
                )}
              </div>
            ) : (
              <div className="text-xs italic text-muted-foreground">Selecciona fechas en el calendario</div>
            )}
          </div>
          
          <Button 
            onClick={handleDownload} 
            className="w-full h-11 font-bold shadow-lg shadow-primary/20" 
            disabled={!dateRange?.from || isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            {isDownloading ? "Procesando Datos..." : "Generar Reporte Excel"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
