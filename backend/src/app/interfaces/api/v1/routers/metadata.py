"""
Metadata API Router

Endpoints para fornecer valores únicos de campos para dropdowns:
- Gêneros (characters)
- Climas (planets)
- Terrenos (planets)
- Classificações (species)
- Idiomas (species)
- Fabricantes (starships/vehicles)
- Classes (starships/vehicles)
- Diretores/Produtores (films)
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends

from app.domain.repositories.swapi_client import ISWAPIClient
from app.interfaces.api.v1.dependencies.services import get_swapi_client

router = APIRouter(prefix="/metadata", tags=["metadata"])


def _extract_unique_values(items: List[dict], field: str, split_multi: bool = False) -> List[str]:
    """
    Extrai valores únicos de um campo.
    
    Args:
        items: Lista de items
        field: Nome do campo
        split_multi: Se True, split valores múltiplos (ex: "arid, hot" -> ["arid", "hot"])
    
    Returns:
        Lista de valores únicos ordenados
    """
    values = set()
    
    for item in items:
        value = item.get(field, "")
        if not value or value.lower() in ("unknown", "n/a", "none", "null", ""):
            continue
        
        if split_multi:
            # Split por vírgula e limpa cada parte
            parts = [v.strip() for v in str(value).split(",")]
            values.update(p for p in parts if p)
        else:
            values.add(str(value).strip())
    
    return sorted(list(values))


@router.get("/genders", response_model=List[str])
async def get_unique_genders(
    swapi: ISWAPIClient = Depends(get_swapi_client),
) -> List[str]:
    """
    Retorna lista de gêneros únicos dos personagens.
    
    Usado para popular dropdown de filtro de gênero.
    """
    people = await swapi.get_all_people()
    genders = _extract_unique_values(people, "gender")
    
    # Garante ordem específica para valores conhecidos
    known_order = ["male", "female", "hermaphrodite", "n/a", "none"]
    ordered = [g for g in known_order if g in genders]
    others = [g for g in genders if g not in known_order]
    
    return ordered + sorted(others)


@router.get("/climates", response_model=List[str])
async def get_unique_climates(
    swapi: ISWAPIClient = Depends(get_swapi_client),
) -> List[str]:
    """
    Retorna lista de climas únicos dos planetas.
    
    Valores podem ser compostos (ex: "arid, hot"), por isso fazemos split.
    """
    planets = await swapi.get_all_planets()
    return _extract_unique_values(planets, "climate", split_multi=True)


@router.get("/terrains", response_model=List[str])
async def get_unique_terrains(
    swapi: ISWAPIClient = Depends(get_swapi_client),
) -> List[str]:
    """
    Retorna lista de terrenos únicos dos planetas.
    
    Valores podem ser compostos (ex: "desert, mountains").
    """
    planets = await swapi.get_all_planets()
    return _extract_unique_values(planets, "terrain", split_multi=True)


@router.get("/classifications", response_model=List[str])
async def get_unique_classifications(
    swapi: ISWAPIClient = Depends(get_swapi_client),
) -> List[str]:
    """
    Retorna lista de classificações únicas das espécies.
    """
    species = await swapi.get_all_species()
    return _extract_unique_values(species, "classification")


@router.get("/languages", response_model=List[str])
async def get_unique_languages(
    swapi: ISWAPIClient = Depends(get_swapi_client),
) -> List[str]:
    """
    Retorna lista de idiomas únicos das espécies.
    """
    species = await swapi.get_all_species()
    return _extract_unique_values(species, "language")


@router.get("/starship-manufacturers", response_model=List[str])
async def get_unique_starship_manufacturers(
    swapi: ISWAPIClient = Depends(get_swapi_client),
) -> List[str]:
    """
    Retorna lista de fabricantes únicos de naves.
    """
    starships = await swapi.get_all_starships()
    return _extract_unique_values(starships, "manufacturer", split_multi=True)


@router.get("/starship-classes", response_model=List[str])
async def get_unique_starship_classes(
    swapi: ISWAPIClient = Depends(get_swapi_client),
) -> List[str]:
    """
    Retorna lista de classes únicas de naves.
    """
    starships = await swapi.get_all_starships()
    return _extract_unique_values(starships, "starship_class")


@router.get("/vehicle-manufacturers", response_model=List[str])
async def get_unique_vehicle_manufacturers(
    swapi: ISWAPIClient = Depends(get_swapi_client),
) -> List[str]:
    """
    Retorna lista de fabricantes únicos de veículos.
    """
    vehicles = await swapi.get_all_vehicles()
    return _extract_unique_values(vehicles, "manufacturer", split_multi=True)


@router.get("/vehicle-classes", response_model=List[str])
async def get_unique_vehicle_classes(
    swapi: ISWAPIClient = Depends(get_swapi_client),
) -> List[str]:
    """
    Retorna lista de classes únicas de veículos.
    """
    vehicles = await swapi.get_all_vehicles()
    return _extract_unique_values(vehicles, "vehicle_class")


@router.get("/directors", response_model=List[str])
async def get_unique_directors(
    swapi: ISWAPIClient = Depends(get_swapi_client),
) -> List[str]:
    """
    Retorna lista de diretores únicos dos filmes.
    """
    films = await swapi.get_all_films()
    return _extract_unique_values(films, "director")


@router.get("/producers", response_model=List[str])
async def get_unique_producers(
    swapi: ISWAPIClient = Depends(get_swapi_client),
) -> List[str]:
    """
    Retorna lista de produtores únicos dos filmes.
    
    Produtores podem vir separados por vírgula.
    """
    films = await swapi.get_all_films()
    return _extract_unique_values(films, "producer", split_multi=True)
