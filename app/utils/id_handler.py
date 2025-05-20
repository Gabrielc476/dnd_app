# app/utils/id_handler.py
from typing import Union, Any, Optional, List, Dict
from bson import ObjectId
from bson.errors import InvalidId


class IdHandler:
    """
    Classe utilitária para lidar com IDs do MongoDB de forma robusta.
    Permite converter entre diferentes formatos (string, ObjectId) e
    validar IDs antes de buscar no banco de dados.
    """

    @staticmethod
    def is_valid_id(id_value: Any) -> bool:
        """Verifica se o valor é um ID válido (seja string ou ObjectId)."""
        if isinstance(id_value, ObjectId):
            return True
        if not isinstance(id_value, str):
            return False
        try:
            ObjectId(id_value)
            return True
        except (InvalidId, TypeError):
            return False

    @staticmethod
    def to_object_id(id_value: Any) -> Optional[ObjectId]:
        """
        Converte um ID para ObjectId se possível, ou retorna None.
        Aceita strings, ObjectId, ou PyObjectId.
        """
        if id_value is None:
            return None

        if isinstance(id_value, ObjectId):
            return id_value

        if isinstance(id_value, str):
            try:
                return ObjectId(id_value)
            except (InvalidId, TypeError):
                return None

        # Tenta extrair o valor string do objeto se for um PyObjectId
        try:
            if hasattr(id_value, "__str__"):
                return ObjectId(str(id_value))
        except (InvalidId, TypeError):
            pass

        return None

    @staticmethod
    def to_string(id_value: Any) -> Optional[str]:
        """Converte um ID para string se possível, ou retorna None."""
        if id_value is None:
            return None

        if isinstance(id_value, str):
            # Tenta validar se é um ObjectId válido
            try:
                ObjectId(id_value)
                return id_value
            except (InvalidId, TypeError):
                return None

        if isinstance(id_value, ObjectId):
            return str(id_value)

        # Tenta extrair o valor string do objeto
        try:
            return str(id_value)
        except Exception:
            return None

    @staticmethod
    def query_id(id_value: Any) -> Dict[str, Any]:
        """
        Gera um filtro de consulta que tentará corresponder a várias representações de ID.
        Útil para fazer consultas que funcionem com diferentes formatos de ID.
        """
        object_id = IdHandler.to_object_id(id_value)
        string_id = IdHandler.to_string(id_value)

        if not object_id and not string_id:
            # Se ambos forem inválidos, retornar um filtro que não encontrará nada
            return {"_id": {"$exists": False}}

        queries = []

        if object_id:
            queries.append({"_id": object_id})

        if string_id:
            queries.append({"_id": string_id})

        # Se houver apenas uma query, retorna-a diretamente
        if len(queries) == 1:
            return queries[0]

        # Caso contrário, retorna uma consulta OR para tentar todas as opções
        return {"$or": queries}

    @staticmethod
    def normalize_id(document: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normaliza o campo _id em um documento para string.
        Útil para padronizar documentos antes de enviá-los via API.
        """
        if not document:
            return document

        doc_copy = document.copy()
        if "_id" in doc_copy and doc_copy["_id"] is not None:
            doc_copy["_id"] = IdHandler.to_string(doc_copy["_id"])

        return doc_copy

    @staticmethod
    def normalize_ids(documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Normaliza os campos _id em uma lista de documentos para string."""
        if not documents:
            return documents

        return [IdHandler.normalize_id(doc) for doc in documents]

    # Compatibilidade com a classe PyObjectId existente
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not cls.is_valid_id(v):
            raise ValueError("Invalid ObjectId")
        return str(v)

    # Para uso como factory
    def __new__(cls, *args, **kwargs):
        return str(ObjectId())