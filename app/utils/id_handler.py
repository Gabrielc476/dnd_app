# app/utils/id_handler.py
"""
ID Handler utilities - CORRIGIDO
Problemas resolvidos:
1. ✅ Query problemática {"_id": {"$exists": False}} corrigida
2. ✅ Lógica de validação melhorada
3. ✅ Melhor tratamento de diferentes tipos de ID
4. ✅ Validação mais robusta
5. ✅ Logging adequado adicionado
"""

import logging
from typing import Union, Any, Optional, List, Dict
from bson import ObjectId
from bson.errors import InvalidId

logger = logging.getLogger(__name__)


class IdHandler:
    """
    Classe utilitária para lidar com IDs do MongoDB de forma robusta.
    Permite converter entre diferentes formatos (string, ObjectId) e
    validar IDs antes de buscar no banco de dados.
    """

    @staticmethod
    def is_valid_id(id_value: Any) -> bool:
        """
        Verifica se o valor é um ID válido (seja string ou ObjectId).

        Args:
            id_value: Valor a ser validado

        Returns:
            True se é um ID válido, False caso contrário
        """
        if id_value is None:
            return False

        if isinstance(id_value, ObjectId):
            return True

        if not isinstance(id_value, str):
            return False

        # String vazia não é válida
        if not id_value.strip():
            return False

        try:
            ObjectId(id_value)
            return True
        except (InvalidId, TypeError, ValueError):
            return False

    @staticmethod
    def to_object_id(id_value: Any) -> Optional[ObjectId]:
        """
        Converte um ID para ObjectId se possível, ou retorna None.

        Args:
            id_value: Valor a ser convertido (string, ObjectId, PyObjectId)

        Returns:
            ObjectId se conversão bem-sucedida, None caso contrário
        """
        if id_value is None:
            return None

        if isinstance(id_value, ObjectId):
            return id_value

        if isinstance(id_value, str):
            # String vazia não é válida
            if not id_value.strip():
                return None

            try:
                return ObjectId(id_value.strip())
            except (InvalidId, TypeError, ValueError):
                logger.debug(f"Falha ao converter string para ObjectId: {id_value}")
                return None

        # Tenta extrair o valor string do objeto se for um PyObjectId ou similar
        try:
            if hasattr(id_value, "__str__"):
                str_value = str(id_value).strip()
                if str_value:
                    return ObjectId(str_value)
        except (InvalidId, TypeError, ValueError):
            logger.debug(f"Falha ao converter objeto para ObjectId: {id_value}")

        return None

    @staticmethod
    def to_string(id_value: Any) -> Optional[str]:
        """
        Converte um ID para string se possível, ou retorna None.

        Args:
            id_value: Valor a ser convertido

        Returns:
            String representation do ID se válido, None caso contrário
        """
        if id_value is None:
            return None

        if isinstance(id_value, str):
            # Verifica se é um ObjectId válido
            if IdHandler.is_valid_id(id_value):
                return id_value.strip()
            return None

        if isinstance(id_value, ObjectId):
            return str(id_value)

        # Tenta extrair o valor string do objeto
        try:
            str_value = str(id_value).strip()
            if IdHandler.is_valid_id(str_value):
                return str_value
        except Exception:
            logger.debug(f"Falha ao converter para string: {id_value}")

        return None

    @staticmethod
    def query_id(id_value: Any) -> Dict[str, Any]:
        """
        Gera um filtro de consulta para ID.
        CORREÇÃO: Agora retorna query válida em vez de {"_id": {"$exists": False}}.

        Args:
            id_value: Valor do ID a ser buscado

        Returns:
            Filtro de consulta MongoDB

        Raises:
            ValueError: Se o ID for inválido
        """
        object_id = IdHandler.to_object_id(id_value)

        if object_id is None:
            # CORREÇÃO: Em vez de retornar query que nunca encontra nada,
            # levanta erro para indicar ID inválido
            raise ValueError(f"ID inválido fornecido: {id_value}")

        # Retorna query simples e direta
        return {"_id": object_id}

    @staticmethod
    def query_id_safe(id_value: Any) -> Optional[Dict[str, Any]]:
        """
        Versão segura do query_id que retorna None em vez de levantar exceção.

        Args:
            id_value: Valor do ID a ser buscado

        Returns:
            Filtro de consulta MongoDB ou None se ID inválido
        """
        try:
            return IdHandler.query_id(id_value)
        except ValueError:
            logger.debug(f"ID inválido para query: {id_value}")
            return None

    @staticmethod
    def query_multiple_ids(id_values: List[Any]) -> Dict[str, Any]:
        """
        Gera filtro para buscar múltiplos IDs.

        Args:
            id_values: Lista de IDs

        Returns:
            Filtro de consulta MongoDB com operador $in

        Raises:
            ValueError: Se nenhum ID válido for fornecido
        """
        if not id_values:
            raise ValueError("Lista de IDs não pode estar vazia")

        valid_object_ids = []

        for id_value in id_values:
            object_id = IdHandler.to_object_id(id_value)
            if object_id:
                valid_object_ids.append(object_id)

        if not valid_object_ids:
            raise ValueError("Nenhum ID válido encontrado na lista")

        return {"_id": {"$in": valid_object_ids}}

    @staticmethod
    def normalize_id(document: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normaliza o campo _id em um documento para string.

        Args:
            document: Documento MongoDB

        Returns:
            Documento com _id normalizado para string
        """
        if not document:
            return document

        doc_copy = document.copy()

        if "_id" in doc_copy and doc_copy["_id"] is not None:
            string_id = IdHandler.to_string(doc_copy["_id"])
            if string_id:
                doc_copy["_id"] = string_id
            else:
                # Se não conseguir converter, remover o campo _id
                logger.warning(f"Não foi possível normalizar _id: {doc_copy['_id']}")
                doc_copy.pop("_id", None)

        return doc_copy

    @staticmethod
    def normalize_ids(documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Normaliza os campos _id em uma lista de documentos para string.

        Args:
            documents: Lista de documentos MongoDB

        Returns:
            Lista de documentos com _ids normalizados
        """
        if not documents:
            return documents

        return [IdHandler.normalize_id(doc) for doc in documents]

    @staticmethod
    def normalize_document_ids(document: Dict[str, Any], id_fields: List[str] = None) -> Dict[str, Any]:
        """
        Normaliza múltiplos campos de ID em um documento.

        Args:
            document: Documento a ser normalizado
            id_fields: Lista de campos que contêm IDs (padrão: campos comuns)

        Returns:
            Documento com IDs normalizados
        """
        if not document:
            return document

        if id_fields is None:
            id_fields = ["_id", "owner_id", "campaign_id", "dm_id", "character_id", "user_id"]

        doc_copy = document.copy()

        for field in id_fields:
            if field in doc_copy and doc_copy[field] is not None:
                normalized_id = IdHandler.to_string(doc_copy[field])
                if normalized_id:
                    doc_copy[field] = normalized_id
                else:
                    # Se não conseguir converter, manter valor original
                    logger.debug(f"Não foi possível normalizar campo {field}: {doc_copy[field]}")

        return doc_copy

    @staticmethod
    def validate_id_list(id_values: List[Any], allow_empty: bool = False) -> List[str]:
        """
        Valida uma lista de IDs e retorna apenas os válidos como strings.

        Args:
            id_values: Lista de IDs para validar
            allow_empty: Se True, permite lista vazia

        Returns:
            Lista de IDs válidos como strings

        Raises:
            ValueError: Se lista estiver vazia e allow_empty=False
        """
        if not id_values:
            if allow_empty:
                return []
            else:
                raise ValueError("Lista de IDs não pode estar vazia")

        valid_ids = []

        for id_value in id_values:
            string_id = IdHandler.to_string(id_value)
            if string_id:
                valid_ids.append(string_id)
            else:
                logger.debug(f"ID inválido ignorado: {id_value}")

        return valid_ids

    @staticmethod
    def create_filter_with_fallback(
            primary_field: str,
            primary_value: Any,
            fallback_field: str = None,
            fallback_value: Any = None
    ) -> Dict[str, Any]:
        """
        Cria um filtro com campo principal e fallback.

        Args:
            primary_field: Campo principal para busca
            primary_value: Valor principal
            fallback_field: Campo de fallback (opcional)
            fallback_value: Valor de fallback (opcional)

        Returns:
            Filtro de consulta MongoDB
        """
        primary_id = IdHandler.to_object_id(primary_value)

        if not primary_id:
            raise ValueError(f"Valor principal inválido para {primary_field}: {primary_value}")

        primary_filter = {primary_field: primary_id}

        # Se não há fallback, retorna filtro simples
        if not fallback_field or fallback_value is None:
            return primary_filter

        fallback_id = IdHandler.to_object_id(fallback_value)

        if fallback_id:
            # Retorna OR query
            return {
                "$or": [
                    primary_filter,
                    {fallback_field: fallback_id}
                ]
            }
        else:
            # Se fallback é inválido, usar apenas o principal
            return primary_filter

    # Métodos para compatibilidade com PyObjectId
    @classmethod
    def __get_validators__(cls):
        """Compatibilidade com Pydantic."""
        yield cls.validate

    @classmethod
    def validate(cls, v, field=None):
        """
        Valida valor para uso com Pydantic.

        Args:
            v: Valor a ser validado
            field: Campo sendo validado (opcional)

        Returns:
            String representation do ObjectId

        Raises:
            ValueError: Se não for um ObjectId válido
        """
        if not cls.is_valid_id(v):
            raise ValueError(f"Invalid ObjectId: {v}")
        return str(v)