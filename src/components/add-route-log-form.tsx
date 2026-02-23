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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Driver, Sede } from "@/app/lib/types";

const formSchema = z.object({
  driverId: z.string().min(1, "Debes seleccionar un conductor"),
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
  const form = useForm<AddRouteLogFormValues>({resolver: zodResolver(formSchema.superRefine((data, ctx) => {
        if (isAdmin && !data.sede) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Como administrador, debes seleccionar una sede.",
                path: ["sede"],
            });
        }
    })),
    defaultValues: {
      driverId: "",
      morningObservations: "",
    },
  });

  function onSubmit(values: AddRouteLogFormValues) {
    onAddLog(values);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
        <FormField
          control={form.control}
          name="driverId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conductor</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un conductor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="morningObservations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones (Turno Mañana)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas sobre la ruta o el vehículo..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Añadir Registro
        </Button>
      </form>
    </Form>
  );
}
