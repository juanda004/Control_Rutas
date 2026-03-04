
"use client";

import { useState } from 'react';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
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
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Gestionar Conductores</h2>
                 <Button onClick={openNewDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Conductor
                </Button>
            </div>

            <div className="border rounded-lg bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead className="hidden md:table-cell">Nº Ruta</TableHead>
                            <TableHead className="hidden md:table-cell">Matrícula</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {drivers.map(driver => (
                            <TableRow key={driver.id}>
                                <TableCell className="font-medium">{driver.name}</TableCell>
                                <TableCell className="hidden md:table-cell">{driver.routeNumber}</TableCell>
                                <TableCell className="hidden md:table-cell">{driver.licensePlate}</TableCell>
                                <TableCell>
                                    <Badge variant={driver.isActive ? 'default' : 'secondary'}>
                                        {driver.isActive ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(driver)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta acción no se puede deshacer. Esto eliminará permanentemente al conductor.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(driver.id)}>Eliminar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
                setIsFormOpen(isOpen);
                if (!isOpen) setEditingDriver(null);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingDriver ? 'Editar Conductor' : 'Añadir Nuevo Conductor'}</DialogTitle>
                    </DialogHeader>
                    <DriverForm onSubmit={handleFormSubmit} driver={editingDriver} />
                </DialogContent>
            </Dialog>
        </div>
    );
}
