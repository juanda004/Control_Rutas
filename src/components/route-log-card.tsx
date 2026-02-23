"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  LogIn,
  LogOut,
  FileSignature,
  Clock,
  User,
  Map,
  RectangleHorizontal,
  BookText,
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
          <span className="text-xs text-muted-foreground">Firmado:</span>
          <img
            src={signature}
            alt="Firma"
            className="h-10 w-24 object-contain invert-0 dark:invert"
          />
        </div>
      ) : (
        <div className="flex items-center text-xs">
          <FileSignature className="h-3 w-3 mr-1" />
          <span>{signature}</span>
        </div>
      ))}
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

  const isMorningComplete = log.morningCheckIn && log.morningCheckOut && log.morningSignature;
  const isAfternoonComplete = log.afternoonCheckIn && log.afternoonCheckOut && log.afternoonSignature;

  const getStatus = () => {
    if (!log.morningCheckIn) return { text: "Pendiente de Inicio", variant: "outline" as const };
    if (!log.morningCheckOut) return { text: "Turno Mañana Activo", variant: "default" as const };
    if (!log.morningSignature) return { text: "Turno Mañana Finalizado", variant: "secondary" as const };
    if (!log.afternoonCheckIn) return { text: "Esperando Turno Tarde", variant: "outline" as const };
    if (!log.afternoonCheckOut) return { text: "Turno Tarde Activo", variant: "default" as const };
    if (!log.afternoonSignature) return { text: "Turno Tarde Finalizado", variant: "secondary" as const };
    return { text: "Completado", variant: "default" as const, completed: true };
  };

  const status = getStatus();

  return (
    <Card className={`flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 ${status.completed ? 'bg-green-50' : 'bg-card'}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="flex items-center gap-2">
                    <Map className="text-primary"/> 
                    Ruta {log.routeNumber}
                </CardTitle>
                <CardDescription>Conductor: {log.driver?.name || log.driverId}</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Badge variant="outline" className="text-xs">{log.sede}</Badge>
                <Badge variant={status.variant} className="text-xs">
                    {status.completed && <CheckCircle2 className="mr-1.5 h-3.5 w-3.5"/>}
                    {status.text}
                </Badge>
              </div>
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
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el registro de ruta para <strong>{log.driver?.name}</strong> en la fecha <strong>{format(new Date(log.logDate.replace(/-/g, '/')), "d/MM/yy")}</strong>.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-4">
          <InfoItem icon={User} label="Conductor" value={log.driver?.name} />
          <InfoItem icon={RectangleHorizontal} label="Matrícula" value={log.licensePlate} />
        </div>
         {log.morningObservations && (
          <div className="pt-2">
            <p className="text-xs font-bold text-muted-foreground">Obs. Mañana:</p>
            <div className="flex items-start text-sm text-muted-foreground">
                <BookText className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <p className="border-l-2 pl-3 text-sm italic">"{log.morningObservations}"</p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        {/* Morning Shift */}
        <div className="space-y-3">
          <h4 className="font-semibold">Turno Mañana</h4>
          <TimeLog label="Check-in" timestamp={log.morningCheckIn} />
          <TimeLog label="Check-out" timestamp={log.morningCheckOut} signature={log.morningSignature} />
          <div className="flex gap-2 justify-end flex-wrap">
            {!log.morningCheckIn && (
              <Button size="sm" onClick={() => handleTimeUpdate("morning", "CheckIn")}>
                <LogIn className="mr-2 h-4 w-4" /> Check-In Mañana
              </Button>
            )}
            {log.morningCheckIn && !log.morningCheckOut && (
              <Button size="sm" onClick={() => handleTimeUpdate("morning", "CheckOut")}>
                <LogOut className="mr-2 h-4 w-4" /> Check-Out Mañana
              </Button>
            )}
            {log.morningCheckOut && !log.morningSignature && (
              <Button size="sm" onClick={() => setSignatureShift("morning")}>
                <FileSignature className="mr-2 h-4 w-4" /> Firmar
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Afternoon Shift */}
        <div className={`space-y-3 ${!isMorningComplete ? 'opacity-50 pointer-events-none' : ''}`}>
          <h4 className="font-semibold">Turno Tarde</h4>
          {isMorningComplete && !log.afternoonSignature && (
            <div className="space-y-2">
                <Label htmlFor={`afternoon-obs-${log.id}`} className="text-xs font-bold text-muted-foreground">Obs. Tarde:</Label>
                <Textarea
                    id={`afternoon-obs-${log.id}`}
                    placeholder="Notas sobre el turno de tarde..."
                    value={afternoonObs}
                    onChange={(e) => setAfternoonObs(e.target.value)}
                    className="resize-none"
                    disabled={!!log.afternoonSignature}
                />
            </div>
          )}
          {log.afternoonObservations && !!log.afternoonSignature && (
             <div className="pt-2">
                <p className="text-xs font-bold text-muted-foreground">Obs. Tarde:</p>
                <div className="flex items-start text-sm text-muted-foreground">
                    <BookText className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="border-l-2 pl-3 text-sm italic">"{log.afternoonObservations}"</p>
                </div>
            </div>
          )}
          <TimeLog label="Check-in" timestamp={log.afternoonCheckIn} />
          <TimeLog label="Check-out" timestamp={log.afternoonCheckOut} signature={log.afternoonSignature}/>
          <div className="flex gap-2 justify-end flex-wrap">
             {isMorningComplete && !log.afternoonCheckIn && (
              <Button size="sm" onClick={() => handleTimeUpdate("afternoon", "CheckIn")}>
                <LogIn className="mr-2 h-4 w-4" /> Check-In Tarde
              </Button>
            )}
            {log.afternoonCheckIn && !log.afternoonCheckOut && (
              <Button size="sm" onClick={() => handleTimeUpdate("afternoon", "CheckOut")}>
                <LogOut className="mr-2 h-4 w-4" /> Check-Out Tarde
              </Button>
            )}
            {log.afternoonCheckOut && !log.afternoonSignature && (
              <Button size="sm" onClick={() => setSignatureShift("afternoon")}>
                <FileSignature className="mr-2 h-4 w-4" /> Firmar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground w-full text-center">
            Fecha: {format(new Date(log.logDate.replace(/-/g, '/')), "d 'de' MMMM, yyyy", { locale: es })}
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