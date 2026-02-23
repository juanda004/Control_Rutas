"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download } from 'lucide-react';
import { type Driver, type RouteLog, type Sede } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface DownloadReportProps {
  drivers: Driver[] | null;
  allLogs: RouteLog[] | null;
  isAdmin: boolean;
  selectedSede: Sede | null;
}
export function DownloadReport({ drivers, allLogs, isAdmin, selectedSede }: DownloadReportProps) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setIsClient(true);
    const now = new Date();
    setToday(now);
    setDate(now);
  }, []);

  const handleDownload = () => {
    if (!allLogs || !drivers || !date) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pueden cargar los datos para el reporte.",
      });
      return;
    }

    const selectedDateStr = format(date, 'yyyy-MM-dd');
     let logsForDate = allLogs.filter(log => log.logDate === selectedDateStr);

    if (!isAdmin && selectedSede) {
      logsForDate = logsForDate.filter(log => log.sede === selectedSede);
    }

    if (logsForDate.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay registros para la fecha y sede seleccionada.",
      });
      return;
    }

    const dataToExport = logsForDate.map(log => {
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
    
    // Auto-size columns
    const max_width = dataToExport.reduce((w, r) => Math.max(w, ...Object.values(r).map(val => (val || '').toString().length)), 10);
    worksheet["!cols"] = Object.keys(dataToExport[0]).map(() => ({ wch: max_width }));

    XLSX.writeFile(workbook, `Reporte_TrackRuta_${selectedDateStr}.xlsx`);
    setIsPopoverOpen(false);
  };
  
  if (!isClient) {
    return <Skeleton className="h-9 w-[175px]" />;
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="sm:size-auto">
          <Download className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Descargar Reporte</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          locale={es}
          disabled={(d) => d > (today || new Date()) || d < new Date('2000-01-01')}
        />
        <div className="p-2 border-t">
          <Button onClick={handleDownload} className="w-full" disabled={!date}>
            Descargar .xlsx
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}