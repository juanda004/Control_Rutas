
"use client";

import { useState } from 'react';
import { PlusCircle, Trash2, Edit, Users } from 'lucide-react';
import { Driver } from '@/app/lib/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { DriverForm } from './driver-form';
import { useFirestore } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
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
} from "@/components/ui/alert-dialog"

interface AdminDriverListProps {
    drivers: Driver[];
}

export function AdminDriverList({ drivers }: AdminDriverListProps) {
    const firestore = useFirestore();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

    const handleFormSubmit = (driverData: Omit<Driver, 'id'>) => {
        if (!firestore) return;
        if (editingDriver) {
            updateDocumentNonBlocking(doc(firestore, 'drivers', editingDriver.id), driverData);
        } else {
            addDocumentNonBlocking(collection(firestore, 'drivers'), driverData);
        }
        setIsFormOpen(false);
        setEditingDriver(null);
    }

    const handleDelete = (driverId: string) => {
        if (!firestore) return;
        deleteDocumentNonBlocking(doc(firestore, 'drivers', driverId));
    }

    const openEditDialog = (driver: Driver) => {
        setEditingDriver(driver);
        setIsFormOpen(true);
    }
    
    const openNewDialog = () => {
        setEditingDriver(null);
        setIsFormOpen(true);
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-bold tracking-tight">Conductores ({drivers.length})</h2>
                </div>
                 <Button onClick={openNewDialog} className="shadow-md">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Nuevo Conductor</span>
                    <span className="sm:hidden">Nuevo</span>
                </Button>
            </div>

            <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="font-bold">Nombre</TableHead>
                            <TableHead className="hidden md:table-cell font-bold">Nº Ruta</TableHead>
                            <TableHead className="hidden md:table-cell font-bold">Matrícula</TableHead>
                            <TableHead className="font-bold">Estado</TableHead>
                            <TableHead className="text-right font-bold">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {drivers.length > 0 ? (
                            drivers.map(driver => (
                                <TableRow key={driver.id} className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-medium">{driver.name}</TableCell>
                                    <TableCell className="hidden md:table-cell">{driver.routeNumber}</TableCell>
                                    <TableCell className="hidden md:table-cell font-mono text-xs">{driver.licensePlate}</TableCell>
                                    <TableCell>
                                        <Badge variant={driver.isActive ? 'default' : 'secondary'} className="rounded-md">
                                            {driver.isActive ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(driver)} className="h-8 w-8">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>¿Eliminar conductor?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción no se puede deshacer. Se eliminará a <strong>{driver.name}</strong> del sistema.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(driver.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No se encontraron conductores.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
                setIsFormOpen(isOpen);
                if (!isOpen) setEditingDriver(null);
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingDriver ? 'Editar Conductor' : 'Añadir Nuevo Conductor'}</DialogTitle>
                    </DialogHeader>
                    <DriverForm onSubmit={handleFormSubmit} driver={editingDriver} />
                </DialogContent>
            </Dialog>
        </div>
    );
}
