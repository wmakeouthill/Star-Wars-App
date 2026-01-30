class ResourceNotFoundError(Exception):
    def __init__(self, resource: str, resource_id: str) -> None:
        super().__init__(f"{resource} {resource_id} não encontrado")
        self.resource = resource
        self.resource_id = resource_id
