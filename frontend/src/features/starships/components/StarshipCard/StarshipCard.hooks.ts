import { Starship } from '../../types/starships.types';
import { formatSwapiQuantity } from '@/shared/utils/formatters';

export function useStarshipCard(starship: Starship) {
    const consumablesLabel = (starship.consumables ?? '').trim() || 'Desconhecido';

    return {
        crewLabel: formatSwapiQuantity({
            value: starship.crew,
            raw: starship.crew_raw,
            min: starship.crew_min ?? null,
            max: starship.crew_max ?? null,
        }),
        passengersLabel: formatSwapiQuantity({
            value: starship.passengers,
            raw: starship.passengers_raw,
            min: starship.passengers_min ?? null,
            max: starship.passengers_max ?? null,
        }),
        hyperdriveLabel: formatSwapiQuantity({
            value: starship.hyperdrive_rating ?? null,
            raw: starship.hyperdrive_rating_raw,
        }),
        mgltLabel: formatSwapiQuantity({
            value: starship.mglt ?? null,
            raw: starship.mglt_raw,
        }),
        costLabel: formatSwapiQuantity({
            value: starship.cost_in_credits ?? null,
            raw: starship.cost_in_credits_raw,
            unit: 'cr',
        }),
        lengthLabel: formatSwapiQuantity({
            value: starship.length ?? null,
            raw: starship.length_raw,
            unit: 'm',
        }),
        speedLabel: formatSwapiQuantity({
            value: starship.max_atmosphering_speed ?? null,
            raw: starship.max_atmosphering_speed_raw,
            unit: 'km/h',
        }),
        cargoLabel: formatSwapiQuantity({
            value: starship.cargo_capacity ?? null,
            raw: starship.cargo_capacity_raw,
        }),
        consumablesLabel,
    };
}
