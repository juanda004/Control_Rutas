"use client";

import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type Shift } from "@/app/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Eraser } from "lucide-react";

interface SignatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signature: string) => void;
  shift: Shift | null;
}

export function SignatureDialog({
  isOpen,
  onClose,
  onSave,
  shift,
}: SignatureDialogProps) {
  const sigPad = useRef<SignatureCanvas | null>(null);
  const { toast } = useToast();

  const clear = () => {
    sigPad.current?.clear();
  };

  const handleSave = () => {
    if (sigPad.current?.isEmpty()) {
      toast({
        variant: "destructive",
        title: "Firma vacía",
        description: "Por favor, dibuja tu firma antes de guardar.",
      });
      return;
    }
    const dataUrl = sigPad.current?.getTrimmedCanvas().toDataURL("image/png");
    if (dataUrl) {
      onSave(dataUrl);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      sigPad.current?.clear();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Firma Digital</DialogTitle>
          <DialogDescription>
            Dibuja tu firma para el turno de{" "}
            <span className="capitalize font-semibold">
              {shift === "morning" ? "mañana" : "tarde"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="rounded-lg border bg-background">
            <SignatureCanvas
              ref={sigPad}
              penColor="black"
              canvasProps={{
                className: "w-full h-48 rounded-lg",
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <div className="flex-grow" />
          <Button variant="ghost" onClick={clear}>
            <Eraser className="mr-2 h-4 w-4" />
            Limpiar
          </Button>
          <Button onClick={handleSave}>
            Guardar Firma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
