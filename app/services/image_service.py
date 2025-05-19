# app/services/image_service.py
from datetime import datetime
import os
import uuid
from typing import List, Dict, Optional, Any, BinaryIO
from bson import ObjectId
from fastapi import HTTPException, status, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.campaign import ImageSchema
from app.config import settings


class ImageService:
    """
    Serviço para gerenciar operações relacionadas a imagens.

    Responsável por:
    - Processar uploads de imagens
    - Armazenar e recuperar imagens do sistema de arquivos
    - Gerenciar metadados de imagens nas campanhas
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        """
        Inicializa o serviço com a conexão de banco de dados.

        Args:
            db: Conexão com o banco de dados MongoDB
        """
        self.db = db

        # Diretório para armazenar imagens
        self.upload_dir = os.environ.get("UPLOAD_DIR", "uploads")

        # Criar diretório se não existir
        os.makedirs(self.upload_dir, exist_ok=True)

    async def upload_image(
            self,
            campaign_id: str,
            user_id: str,
            file: UploadFile,
            name: str,
            description: Optional[str] = None,
            tags: List[str] = None,
            is_map: bool = False,
            grid_enabled: bool = False,
            grid_size: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Faz upload de uma imagem para uma campanha.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário que está fazendo o upload (deve ser o DM)
            file: Arquivo de imagem
            name: Nome da imagem
            description: Descrição da imagem (opcional)
            tags: Tags para categorizar a imagem (opcional)
            is_map: Se a imagem é um mapa (opcional)
            grid_enabled: Se o mapa tem grade habilitada (opcional)
            grid_size: Tamanho da grade em pixels (opcional)

        Returns:
            Dados da imagem adicionada à campanha

        Raises:
            HTTPException: Se a campanha não existir, o usuário não for o DM,
                          ou o upload falhar
        """
        # Verificar se a campanha existe
        campaign = await self.db.campaigns.find_one({"_id": ObjectId(campaign_id)})

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {campaign_id} não encontrada"
            )

        # Verificar se o usuário é o DM da campanha
        if campaign.get("dm_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode fazer upload de imagens para esta campanha"
            )

        # Verificar o tipo de arquivo
        content_type = file.content_type
        if content_type not in settings.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de arquivo não suportado: {content_type}. Apenas {', '.join(settings.ALLOWED_IMAGE_TYPES)} são permitidos."
            )

        # Verificar o tamanho do arquivo
        file_contents = await file.read()
        file_size = len(file_contents)

        if file_size > settings.MAX_UPLOAD_SIZE:
            max_size_mb = settings.MAX_UPLOAD_SIZE / (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Arquivo muito grande. Tamanho máximo permitido: {max_size_mb:.1f}MB"
            )

        # Gerar ID único para a imagem
        image_id = str(uuid.uuid4())

        # Determinar a extensão do arquivo
        filename = file.filename
        extension = os.path.splitext(filename)[1].lower() if filename else ""

        if not extension:
            # Determinar extensão com base no content_type
            if content_type == "image/jpeg":
                extension = ".jpg"
            elif content_type == "image/png":
                extension = ".png"
            elif content_type == "image/gif":
                extension = ".gif"
            elif content_type == "image/webp":
                extension = ".webp"
            else:
                extension = ".bin"  # Fallback genérico

        # Criar o caminho completo do arquivo
        storage_filename = f"{image_id}{extension}"
        file_path = os.path.join(self.upload_dir, storage_filename)

        # Salvar o arquivo no sistema de arquivos
        try:
            with open(file_path, "wb") as f:
                f.write(file_contents)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao salvar o arquivo: {str(e)}"
            )

        # Criar URL relativa para a imagem
        url = f"/images/{storage_filename}"

        # Preparar dados da imagem
        tags = tags or []
        image_data = {
            "id": image_id,
            "url": url,
            "name": name,
            "description": description,
            "tags": tags,
            "is_map": is_map,
            "grid_enabled": grid_enabled,
            "grid_size": grid_size if grid_enabled else None
        }

        # Adicionar a imagem à campanha
        images = campaign.get("images", [])
        images.append(image_data)

        # Atualizar a campanha
        await self.db.campaigns.update_one(
            {"_id": ObjectId(campaign_id)},
            {
                "$set": {
                    "images": images,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        return image_data

    async def get_image(
            self,
            campaign_id: str,
            image_id: str,
            user_id: str
    ) -> Dict[str, Any]:
        """
        Obtém os metadados de uma imagem.

        Args:
            campaign_id: ID da campanha
            image_id: ID da imagem
            user_id: ID do usuário que está fazendo a solicitação

        Returns:
            Metadados da imagem

        Raises:
            HTTPException: Se a campanha ou imagem não forem encontradas,
                          ou o usuário não tiver acesso
        """
        # Verificar se a campanha existe
        campaign = await self.db.campaigns.find_one({"_id": ObjectId(campaign_id)})

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {campaign_id} não encontrada"
            )

        # Verificar se o usuário tem acesso à campanha
        is_dm = campaign.get("dm_id") == user_id
        is_player = user_id in campaign.get("players", [])

        if not (is_dm or is_player):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado a esta campanha"
            )

        # Buscar a imagem
        image = None
        images = campaign.get("images", [])

        for img in images:
            if img.get("id") == image_id:
                image = img
                break

        if not image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Imagem com ID {image_id} não encontrada nesta campanha"
            )

        return image

    async def update_image_metadata(
            self,
            campaign_id: str,
            image_id: str,
            user_id: str,
            updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Atualiza os metadados de uma imagem.

        Args:
            campaign_id: ID da campanha
            image_id: ID da imagem
            user_id: ID do usuário que está fazendo a solicitação (deve ser o DM)
            updates: Dados a serem atualizados

        Returns:
            Imagem atualizada

        Raises:
            HTTPException: Se a campanha ou imagem não forem encontradas,
                          ou o usuário não for o DM
        """
        # Verificar se a campanha existe
        campaign = await self.db.campaigns.find_one({"_id": ObjectId(campaign_id)})

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {campaign_id} não encontrada"
            )

        # Verificar se o usuário é o DM da campanha
        if campaign.get("dm_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode atualizar imagens desta campanha"
            )

        # Buscar a imagem
        images = campaign.get("images", [])
        image_index = None

        for i, img in enumerate(images):
            if img.get("id") == image_id:
                image_index = i
                break

        if image_index is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Imagem com ID {image_id} não encontrada nesta campanha"
            )

        # Atualizar a imagem
        image = images[image_index]

        # Campos permitidos para atualização
        allowed_fields = [
            "name", "description", "tags", "is_map", "grid_enabled", "grid_size"
        ]

        for field, value in updates.items():
            if field in allowed_fields:
                image[field] = value

        # Se grid_enabled for False, remover grid_size
        if "grid_enabled" in updates and not updates["grid_enabled"]:
            image["grid_size"] = None

        # Atualizar a campanha
        await self.db.campaigns.update_one(
            {"_id": ObjectId(campaign_id)},
            {
                "$set": {
                    "images": images,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        return image

    async def delete_image(
            self,
            campaign_id: str,
            image_id: str,
            user_id: str
    ) -> Dict[str, Any]:
        """
        Exclui uma imagem de uma campanha.

        Args:
            campaign_id: ID da campanha
            image_id: ID da imagem
            user_id: ID do usuário que está fazendo a solicitação (deve ser o DM)

        Returns:
            Campanha atualizada

        Raises:
            HTTPException: Se a campanha ou imagem não forem encontradas,
                          ou o usuário não for o DM
        """
        # Verificar se a campanha existe
        campaign = await self.db.campaigns.find_one({"_id": ObjectId(campaign_id)})

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {campaign_id} não encontrada"
            )

        # Verificar se o usuário é o DM da campanha
        if campaign.get("dm_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode excluir imagens desta campanha"
            )

        # Verificar se a imagem está sendo usada em algum encontro
        encounters = campaign.get("encounters", [])
        for encounter in encounters:
            if encounter.get("map_image_id") == image_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Esta imagem está sendo usada como mapa no encontro '{encounter.get('name')}' e não pode ser excluída"
                )

        # Buscar a imagem
        images = campaign.get("images", [])
        image_to_remove = None

        for i, img in enumerate(images):
            if img.get("id") == image_id:
                image_to_remove = img
                del images[i]
                break

        if not image_to_remove:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Imagem com ID {image_id} não encontrada nesta campanha"
            )

        # Atualizar a campanha
        await self.db.campaigns.update_one(
            {"_id": ObjectId(campaign_id)},
            {
                "$set": {
                    "images": images,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Remover o arquivo do sistema de arquivos
        url = image_to_remove.get("url", "")
        if url:
            try:
                filename = os.path.basename(url)
                file_path = os.path.join(self.upload_dir, filename)

                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                # Apenas logar o erro, não falhar a operação
                print(f"Erro ao excluir arquivo: {str(e)}")

        # Recuperar a campanha atualizada
        updated_campaign = await self.db.campaigns.find_one({"_id": ObjectId(campaign_id)})

        return updated_campaign

    async def list_images(
            self,
            campaign_id: str,
            user_id: str,
            tags: Optional[List[str]] = None,
            is_map: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """
        Lista imagens de uma campanha, com filtros opcionais.

        Args:
            campaign_id: ID da campanha
            user_id: ID do usuário que está fazendo a solicitação
            tags: Filtrar por tags (opcional)
            is_map: Filtrar por tipo de imagem (mapa ou não) (opcional)

        Returns:
            Lista de imagens

        Raises:
            HTTPException: Se a campanha não for encontrada ou o usuário não tiver acesso
        """
        # Verificar se a campanha existe
        campaign = await self.db.campaigns.find_one({"_id": ObjectId(campaign_id)})

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campanha com ID {campaign_id} não encontrada"
            )

        # Verificar se o usuário tem acesso à campanha
        is_dm = campaign.get("dm_id") == user_id
        is_player = user_id in campaign.get("players", [])

        if not (is_dm or is_player):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado a esta campanha"
            )

        # Filtrar as imagens
        images = campaign.get("images", [])
        filtered_images = []

        for image in images:
            # Filtrar por tags
            if tags:
                image_tags = image.get("tags", [])
                if not any(tag in image_tags for tag in tags):
                    continue

            # Filtrar por tipo de imagem
            if is_map is not None:
                if image.get("is_map", False) != is_map:
                    continue

            filtered_images.append(image)

        return filtered_images

    async def share_image(
            self,
            campaign_id: str,
            image_id: str,
            user_id: str
    ) -> Dict[str, Any]:
        """
        Compartilha uma imagem com os jogadores.

        Args:
            campaign_id: ID da campanha
            image_id: ID da imagem
            user_id: ID do usuário que está fazendo a solicitação (deve ser o DM)

        Returns:
            Dados da imagem compartilhada

        Raises:
            HTTPException: Se a campanha ou imagem não forem encontradas,
                          ou o usuário não for o DM
        """
        # Obter a imagem
        image = await self.get_image(campaign_id, image_id, user_id)

        # Verificar se o usuário é o DM
        campaign = await self.db.campaigns.find_one({"_id": ObjectId(campaign_id)})

        if campaign.get("dm_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o DM pode compartilhar imagens"
            )

        # A lógica de compartilhamento depende do sistema WebSocket,
        # que será implementado separadamente

        return {
            "status": "success",
            "message": "Imagem compartilhada com os jogadores",
            "image": image
        }