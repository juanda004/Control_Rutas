"use client";

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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Driver } from "@/app/lib/types";
import { Switch } from "@/components/ui/switch";
import { useEffect } from "react";

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  routeNumber: z.string().min(1, "El número de ruta es obligatorio"),
  licensePlate: z.string().min(1, "La matrícula es obligatoria"),
  contactNumber: z.string().optional(),
  isActive: z.boolean(),
});

type DriverFormValues = z.infer<typeof formSchema>;

interface DriverFormProps {
  onSubmit: (data: DriverFormValues) => void;
  driver: Driver | null;
}

export function DriverForm({ onSubmit, driver }: DriverFormProps) {
  const form = useForm<DriverFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: driver || {
      name: "",
      routeNumber: "",
      licensePlate: "",
      contactNumber: "",
      isActive: true,
    },
  });

  useEffect(() => {
    form.reset(driver || {
        name: "",
        routeNumber: "",
        licensePlate: "",
        contactNumber: "",
        isActive: true,
    });
  }, [driver, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="routeNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Ruta</FormLabel>
              <FormControl>
                <Input placeholder="Ej: 101-A" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="licensePlate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Matrícula del Vehículo</FormLabel>
              <FormControl>
                <Input placeholder="Ej: ABC-1234" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Contacto (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="+1 234 567 890" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/20">
                <div className="space-y-0.5">
                    <FormLabel>Conductor Activo</FormLabel>
                    <p className="text-[10px] text-muted-foreground">Permitir asignación de rutas</p>
                </div>
                <FormControl>
                    <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    />
                </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full font-bold h-11">{driver ? 'Guardar Cambios' : 'Registrar Conductor'}</Button>
      </form>
    </Form>
  );
}