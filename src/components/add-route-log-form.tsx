
"use client";

import { useMemo } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Driver } from "@/app/lib/types";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  driverIds: z.array(z.string()).min(1, "Debes seleccionar al menos un conductor"),
  morningObservations: z.string().optional(),
  sede: z.enum(["Preescolar", "Bachillerato"]).optional(),
});

export type AddRouteLogFormValues = z.infer<typeof formSchema>;

interface AddRouteLogFormProps {
  onAddLog: (data: AddRouteLogFormValues) => void;
  drivers: Driver[];
  isAdmin: boolean;
}

export function AddRouteLogForm({ onAddLog, drivers, isAdmin }: AddRouteLogFormProps) {
  const form = useForm<AddRouteLogFormValues>({
    resolver: zodResolver(formSchema.superRefine((data, ctx) => {
        if (isAdmin && !data.sede) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Como administrador, debes seleccionar una sede.",
                path: ["sede"],
            });
        }
    })),
    defaultValues: {
      driverIds: [],
      morningObservations: "",
    },
  });

  const selectedIds = form.watch("driverIds");

  const sortedDrivers = useMemo(() => {
    return [...drivers].sort((a, b) => 
      a.routeNumber.localeCompare(b.routeNumber, undefined, { numeric: true })
    );
  }, [drivers]);

  const toggleAll = () => {
    if (selectedIds.length === sortedDrivers.length) {
      form.setValue("driverIds", []);
    } else {
      form.setValue("driverIds", sortedDrivers.map(d => d.id));
    }
  };

  function onSubmit(values: AddRouteLogFormValues) {
    onAddLog(values);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" suppressHydrationWarning>
        {isAdmin && (
            <FormField
            control={form.control}
            name="sede"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Sede</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona una sede" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Preescolar">Preescolar</SelectItem>
                        <SelectItem value="Bachillerato">Bachillerato</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        )}
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel className="text-sm font-bold">Selección de Conductores ({selectedIds.length})</FormLabel>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={toggleAll}
              className="text-[10px] h-7 font-bold uppercase tracking-wider border-primary/20 hover:bg-primary/5"
            >
              {selectedIds.length === sortedDrivers.length ? "Desmarcar Todos" : "Seleccionar Todos"}
            </Button>
          </div>
          
          <ScrollArea className="h-64 rounded-md border p-4 bg-muted/5">
            <div className="space-y-3">
              {sortedDrivers.map((driver) => (
                <div key={driver.id} className="flex items-center space-x-3 p-2.5 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-primary/10 transition-all">
                  <Checkbox 
                    id={driver.id}
                    checked={selectedIds.includes(driver.id)}
                    onCheckedChange={(checked) => {
                      const current = form.getValues("driverIds");
                      if (checked) {
                        form.setValue("driverIds", [...current, driver.id]);
                      } else {
                        form.setValue("driverIds", current.filter(id => id !== driver.id));
                      }
                    }}
                    className="h-5 w-5"
                  />
                  <Label 
                    htmlFor={driver.id} 
                    className="text-sm cursor-pointer flex-1 font-medium flex items-center justify-between"
                  >
                    <span className="truncate text-foreground/80 font-bold">
                        Ruta {driver.routeNumber} - {driver.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] opacity-70">
                        {driver.licensePlate}
                    </Badge>
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
          <FormMessage />
        </div>

        <FormField
          control={form.control}
          name="morningObservations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones Iniciales</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas adicionales para estos registros..."
                  className="resize-none h-20 bg-muted/5 focus:bg-white"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full font-bold shadow-lg h-12 text-md transition-transform hover:scale-[1.01]">
          Crear {selectedIds.length} Registro{selectedIds.length !== 1 ? 's' : ''}
        </Button>
      </form>
    </Form>
  );
}
