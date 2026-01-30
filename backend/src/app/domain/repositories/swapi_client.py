from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class ISWAPIClient(ABC):
    @abstractmethod
    async def get_all_people(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    async def get_people_page(self, page: int, search: Optional[str] = None) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def get_all_planets(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    async def get_planets_page(self, page: int, search: Optional[str] = None) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def get_all_starships(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    async def get_starships_page(self, page: int, search: Optional[str] = None) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def get_all_films(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    async def get_films_page(self, page: int, search: Optional[str] = None) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def get_person(self, person_id: str) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def get_planet(self, planet_id: str) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def get_starship(self, starship_id: str) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def get_film(self, film_id: str) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def get_resources_by_urls(self, urls: List[str]) -> List[Dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    async def get_resource_by_url(self, url: str) -> Dict[str, Any]:
        raise NotImplementedError
