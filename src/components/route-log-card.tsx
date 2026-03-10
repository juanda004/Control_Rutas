
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  LogIn,
  LogOut,
  FileSignature,
  Clock,
  Map,
  RectangleHorizontal,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { type RouteLogWithDriver, type Shift, type RouteLog } from "@/app/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SignatureDialog } from "@/components/signature-dialog";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { useAdmin } from "@/hooks/useAdmin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { doc } from "firebase/firestore";
import { useFirestore } from "@/firebase";

interface RouteLogCardProps {
  log: RouteLogWithDriver;
  onUpdate: (log: RouteLog) => void;
}

const InfoItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
}) => (
  <div className="flex items-center text-sm text-muted-foreground">
    <Icon className="h-4 w-4 mr-2" />
    <span className="font-medium">{label}:</span>
    <span className="ml-1 text-foreground">{value || "N/A"}</span>
  </div>
);

const TimeLog = ({
  label,
  timestamp,
  signature,
}: {
  label: string;
  timestamp?: number;
  signature?: string;
}) => (
  <div className="flex justify-between items-center text-sm">
    <div className="flex items-center">
      <Clock className="h-4 w-4 mr-2 text-primary" />
      <span className="text-muted-foreground">{label}:</span>
      {timestamp ? (
        <span className="ml-2 font-semibold text-primary">
          {format(timestamp, "hh:mm:ss a")}
        </span>
      ) : (
        <span className="ml-2 text-muted-foreground/70 italic">Pendiente</span>
      )}
    </div>
    {signature &&
      (signature.startsWith("data:image") ? (
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Firmado</span>
          <img
            src={signature}
            alt="Firma"
            className="h-8 w-16 object-contain"
          />
        </div>
      ) : null)}
  </div>
);

export function RouteLogCard({ log, onUpdate }: RouteLogCardProps) {
  const [signatureShift, setSignatureShift] = useState<Shift | null>(null);
  const [afternoonObs, setAfternoonObs] = useState(log.afternoonObservations || "");
  const { isAdmin } = useAdmin();
  const firestore = useFirestore();

  const handleTimeUpdate = (
    shift: Shift,
    type: "CheckIn" | "CheckOut"
  ) => {
    const key = `${shift}${type}` as keyof RouteLog;
    onUpdate({ ...log, [key]: Date.now() });
  };

  const handleSaveSignature = (signature: string) => {
    if (signatureShift) {
      const signatureKey = `${signatureShift}Signature` as keyof RouteLog;
      let updatedLog: RouteLog = { ...log, [signatureKey]: signature };

      if (signatureShift === 'afternoon') {
        updatedLog.afternoonObservations = afternoonObs;
      }
      
      onUpdate(updatedLog);
      setSignatureShift(null);
    }
  };

  const handleDelete = () => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'routeLogs', log.id));
  }

  const isMorningComplete = log.morningCheckIn && log.morningSignature && log.morningCheckOut;

  const getStatus = () => {
    if (!log.morningCheckIn) return { text: "Turno Mañana Pendiente", variant: "outline" as const };
    if (!log.morningSignature) return { text: "Firma Mañana Pendiente", variant: "secondary" as const };
    if (!log.morningCheckOut) return { text: "Mañana: En Curso", variant: "default" as const };
    if (!log.afternoonCheckIn) return { text: "Turno Tarde Pendiente", variant: "outline" as const };
    if (!log.afternoonSignature) return { text: "Firma Tarde Pendiente", variant: "secondary" as const };
    if (!log.afternoonCheckOut) return { text: "Tarde: En Curso", variant: "default" as const };
    return { text: "Ruta Completada", variant: "default" as const, completed: true };
  };

  const status = getStatus();

  return (
    <Card className={`flex flex-col shadow-md hover:shadow-lg transition-all duration-300 ${status.completed ? 'bg-green-50/50 border-green-200' : 'bg-card'}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Map className="h-5 w-5 text-primary"/> 
                    Ruta {log.routeNumber}
                </CardTitle>
                <CardDescription className="text-xs">Conductor: {log.driver?.name || "Sin asignar"}</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={status.variant} className="text-[10px] px-2 py-0.5 whitespace-nowrap font-bold">
                  {status.completed && <CheckCircle2 className="mr-1 h-3 w-3"/>}
                  {status.text}
              </Badge>
              {isAdmin && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar este registro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente el registro de ruta.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
        </div>
        
        <div className="grid grid-cols-1 gap-1 mt-3">
          <InfoItem icon={RectangleHorizontal} label="Matrícula" value={log.licensePlate} />
          <Badge variant="outline" className="w-fit text-[10px] bg-muted/30">{log.sede}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow space-y-4 pt-0">
        <Separator />
        
        {/* Morning Shift */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-400" />
              Turno Mañana
          </h4>
          <div className="space-y-2 bg-muted/20 p-3 rounded-lg border border-dashed">
            <TimeLog label="Entrada" timestamp={log.morningCheckIn} signature={log.morningSignature} />
            <TimeLog label="Salida" timestamp={log.morningCheckOut} />
          </div>

          <div className="flex gap-2 justify-end">
            {!log.morningCheckIn && (
              <Button size="sm" className="h-8 text-xs font-bold" onClick={() => handleTimeUpdate("morning", "CheckIn")}>
                <LogIn className="mr-2 h-3 w-3" /> Marcar Entrada
              </Button>
            )}
            {log.morningCheckIn && !log.morningSignature && (
              <Button size="sm" variant="secondary" className="h-8 text-xs font-bold" onClick={() => setSignatureShift("morning")}>
                <FileSignature className="mr-2 h-3 w-3" /> Registrar Firma
              </Button>
            )}
            {log.morningCheckIn && log.morningSignature && !log.morningCheckOut && (
              <Button size="sm" variant="default" className="h-8 text-xs font-bold bg-primary shadow-sm" onClick={() => handleTimeUpdate("morning", "CheckOut")}>
                <LogOut className="mr-2 h-3 w-3" /> Marcar Salida
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Afternoon Shift */}
        <div className={`space-y-3 ${!isMorningComplete ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
          <h4 className="text-sm font-bold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-400" />
              Turno Tarde
          </h4>
          
          {!log.afternoonSignature && isMorningComplete && (
            <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Observaciones Tarde</Label>
                <Textarea
                    placeholder="Reportar novedades o incidentes..."
                    value={afternoonObs}
                    onChange={(e) => setAfternoonObs(e.target.value)}
                    className="text-xs min-h-[60px] resize-none focus:ring-primary/20"
                />
            </div>
          )}

          <div className="space-y-2 bg-muted/20 p-3 rounded-lg border border-dashed">
            <TimeLog label="Entrada" timestamp={log.afternoonCheckIn} signature={log.afternoonSignature} />
            <TimeLog label="Salida" timestamp={log.afternoonCheckOut} />
          </div>

          <div className="flex gap-2 justify-end">
             {isMorningComplete && !log.afternoonCheckIn && (
              <Button size="sm" className="h-8 text-xs font-bold" onClick={() => handleTimeUpdate("afternoon", "CheckIn")}>
                <LogIn className="mr-2 h-3 w-3" /> Marcar Entrada
              </Button>
            )}
            {log.afternoonCheckIn && !log.afternoonSignature && (
              <Button size="sm" variant="secondary" className="h-8 text-xs font-bold" onClick={() => setSignatureShift("afternoon")}>
                <FileSignature className="mr-2 h-3 w-3" /> Registrar Firma
              </Button>
            )}
            {log.afternoonCheckIn && log.afternoonSignature && !log.afternoonCheckOut && (
              <Button size="sm" variant="default" className="h-8 text-xs font-bold bg-primary shadow-sm" onClick={() => handleTimeUpdate("afternoon", "CheckOut")}>
                <LogOut className="mr-2 h-3 w-3" /> Marcar Salida
              </Button>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="bg-muted/10 py-3 border-t">
        <p className="text-[10px] text-muted-foreground w-full text-center font-medium">
            Registrado el {format(new Date(log.logDate.replace(/-/g, '/')), "d 'de' MMMM, yyyy", { locale: es })}
        </p>
      </CardFooter>

      <SignatureDialog
        isOpen={!!signatureShift}
        onClose={() => setSignatureShift(null)}
        onSave={handleSaveSignature}
        shift={signatureShift}
      />
    </Card>
  );
}
