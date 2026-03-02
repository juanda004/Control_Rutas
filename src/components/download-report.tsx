"use client";

import { useState, useEffect } from 'react';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, CalendarIcon, Info, FileSpreadsheet } from 'lucide-react';
import { type Driver, type RouteLog, type Sede } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRange } from "react-day-picker";
import { cn } from '@/lib/utils';

interface DownloadReportProps {
  drivers: Driver[] | null;
  allLogs: RouteLog[] | null;
  isAdmin: boolean;
  selectedSede: Sede | null;
}

export function DownloadReport({ drivers, allLogs, isAdmin, selectedSede }: DownloadReportProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setIsClient(true);
    const now = new Date();
    setToday(now);
    setDateRange({ from: now, to: now });
  }, []);

  const handleDownload = () => {
    if (!allLogs || !drivers || !dateRange || !dateRange.from) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor, selecciona un rango de fechas válido.",
      });
      return;
    }

    const startDate = startOfDay(dateRange.from);
    const endDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

    let logsInRange = allLogs.filter(log => {
      const logDate = parseISO(log.logDate);
      return isWithinInterval(logDate, { start: startDate, end: endDate });
    });

    if (!isAdmin && selectedSede) {
      logsInRange = logsInRange.filter(log => log.sede === selectedSede);
    } else if (isAdmin && selectedSede) {
        logsInRange = logsInRange.filter(log => log.sede === selectedSede);
    }

    if (logsInRange.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay registros para las fechas y sede seleccionadas.",
      });
      return;
    }

    logsInRange.sort((a, b) => {
        if (a.logDate !== b.logDate) return a.logDate.localeCompare(b.logDate);
        if (a.sede !== b.sede) return a.sede.localeCompare(b.sede);
        const driverA = drivers.find(d => d.id === a.driverId)?.name || '';
        const driverB = drivers.find(d => d.id === b.driverId)?.name || '';
        return driverA.localeCompare(driverB);
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
    
    // Auto-ajuste de columnas
    const cols = Object.keys(dataToExport[0]).map(key => {
        let maxLen = key.length;
        dataToExport.forEach(row => {
            const val = row[key as keyof typeof row] || '';
            maxLen = Math.max(maxLen, val.toString().length);
        });
        return { wch: maxLen + 2 };
    });
    worksheet["!cols"] = cols;

    const rangeStr = dateRange.to && format(dateRange.from, 'yyyy-MM-dd') !== format(dateRange.to, 'yyyy-MM-dd')
        ? `${format(dateRange.from, 'yyyyMMdd')}_a_${format(dateRange.to, 'yyyyMMdd')}`
        : format(dateRange.from, 'yyyyMMdd');

    XLSX.writeFile(workbook, `Reporte_TrackRuta_${rangeStr}.xlsx`);
    setIsPopoverOpen(false);
  };
  
  if (!isClient) {
    return <Skeleton className="h-9 w-[175px]" />;
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="sm:size-auto border-primary/20 hover:border-primary/50 transition-colors">
          <Download className="h-4 w-4 sm:mr-2 text-primary" />
          <span className="hidden sm:inline">Descargar Reporte</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] sm:w-[400px] p-0" align="end">
        <div className="p-4 border-b text-center text-xs font-bold uppercase tracking-widest text-primary bg-primary/5">
            Rango de Fechas para Reporte
        </div>
        <div className="flex justify-center p-2">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            initialFocus
            locale={es}
            numberOfMonths={1}
            disabled={(d) => d > (today || new Date())}
            className="border-0 shadow-none"
          />
        </div>
        <div className="p-5 border-t bg-muted/30">
          <div className="bg-white p-4 rounded-xl border shadow-sm mb-5">
            <div className="text-[10px] text-muted-foreground flex items-center gap-2 mb-2 font-bold uppercase tracking-wider">
               <CalendarIcon className="h-3 w-3 text-primary" />
               Periodo del Reporte
            </div>
            {dateRange?.from ? (
              <div className="text-sm font-bold text-foreground flex items-center gap-2">
                <span className="text-primary">{format(dateRange.from, 'dd/MM/yyyy')}</span>
                {dateRange.to && format(dateRange.from, 'yyyy-MM-dd') !== format(dateRange.to, 'yyyy-MM-dd') && (
                  <>
                    <span className="text-muted-foreground font-normal">→</span>
                    <span className="text-primary">{format(dateRange.to, 'dd/MM/yyyy')}</span>
                  </>
                )}
              </div>
            ) : (
              <div className="text-sm italic text-muted-foreground">Selecciona el rango en el calendario superior</div>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-5 px-1 leading-relaxed">
            <div className="bg-primary/10 p-1.5 rounded-full">
              <Info className="h-3.5 w-3.5 text-primary" />
            </div>
            Selecciona un día de inicio y luego un día de fin para generar el reporte histórico.
          </div>

          <Button 
            onClick={handleDownload} 
            className="w-full h-11 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]" 
            disabled={!dateRange?.from}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Generar Excel (.xlsx)
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}