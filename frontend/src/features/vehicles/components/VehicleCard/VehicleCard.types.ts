import { Vehicle } from '../../types/vehicles.types';

export interface VehicleCardProps {
    vehicle: Vehicle;
    variant?: 'full' | 'compact';
    onViewDetails?: () => void;
}

