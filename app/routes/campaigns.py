# app/routes/campaigns.py
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body, Path, Query, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db import get_database
from app.dependencies import get_current_user, get_current_dm
from app.models.user import User
from app.schemas.campaign import (
    CampaignCreateSchema, CampaignUpdateSchema, CampaignSchema, CampaignListSchema,
    EncounterCreateSchema, EncounterUpdateSchema, ImageSchema, AddPlayerSchema, RemovePlayerSchema
)
from app.services.campaign_service import CampaignService
from app.services.image_service import ImageService

router = APIRouter(
    prefix="/api/campaigns",
    tags=["campaigns"],
    responses={404: {"description": "Not found"}},
)


@router.post("/", response_model=CampaignSchema, status_code=status.HTTP_201_CREATED)
async def create_campaign(
        campaign_data: CampaignCreateSchema,
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Cria uma nova campanha.

    O usuário atual será definido como o DM da campanha.
    """
    # Verificar se o usuário é o DM especificado
    if campaign_data.dm_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você só pode criar campanhas onde você é o DM"
        )

    # Verificar se o usuário tem papel de DM
    if current_user.role != "dm":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas usuários com papel de DM podem criar campanhas"
        )

    campaign_service = CampaignService(db)
    return await campaign_service.create_campaign(campaign_data)


@router.get("/", response_model=List[CampaignListSchema])
async def list_campaigns(
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Lista todas as campanhas do usuário.

    Inclui campanhas onde o usuário é o DM ou jogador.
    """
    campaign_service = CampaignService(db)
    return await campaign_service.list_campaigns_for_user(str(current_user.id))


@router.get("/{campaign_id}", response_model=CampaignSchema)
async def get_campaign(
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Obtém os detalhes de uma campanha específica.

    O usuário deve ser o DM ou um jogador da campanha.
    """
    campaign_service = CampaignService(db)
    return await campaign_service.get_campaign(campaign_id, str(current_user.id))


@router.put("/{campaign_id}", response_model=CampaignSchema)
async def update_campaign(
        updates: CampaignUpdateSchema,
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Atualiza uma campanha existente.

    O usuário deve ser o DM da campanha.
    Apenas os campos especificados serão atualizados.
    """
    campaign_service = CampaignService(db)
    return await campaign_service.update_campaign(campaign_id, str(current_user.id), updates)


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Exclui uma campanha.

    O usuário deve ser o DM da campanha.
    Todos os personagens, NPCs e combates associados também serão excluídos.
    """
    campaign_service = CampaignService(db)
    success = await campaign_service.delete_campaign(campaign_id, str(current_user.id))

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao excluir a campanha"
        )


@router.post("/{campaign_id}/players", response_model=CampaignSchema)
async def add_player(
        player_data: AddPlayerSchema,
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Adiciona um jogador a uma campanha.

    O usuário deve ser o DM da campanha.
    """
    campaign_service = CampaignService(db)
    return await campaign_service.add_player(
        campaign_id, str(current_user.id), player_data.player_id
    )


@router.delete("/{campaign_id}/players", response_model=CampaignSchema)
async def remove_player(
        player_data: RemovePlayerSchema,
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Remove um jogador de uma campanha.

    O usuário deve ser o DM da campanha.
    """
    campaign_service = CampaignService(db)
    return await campaign_service.remove_player(
        campaign_id, str(current_user.id), player_data.player_id
    )


@router.post("/{campaign_id}/encounters", response_model=CampaignSchema)
async def create_encounter(
        encounter_data: EncounterCreateSchema,
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Cria um novo encontro em uma campanha.

    O usuário deve ser o DM da campanha.
    """
    campaign_service = CampaignService(db)
    return await campaign_service.create_encounter(
        campaign_id, str(current_user.id), encounter_data
    )


@router.put("/{campaign_id}/encounters/{encounter_id}", response_model=CampaignSchema)
async def update_encounter(
        updates: EncounterUpdateSchema,
        campaign_id: str = Path(..., title="ID da campanha"),
        encounter_id: str = Path(..., title="ID do encontro"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Atualiza um encontro existente.

    O usuário deve ser o DM da campanha.
    Apenas os campos especificados serão atualizados.
    """
    campaign_service = CampaignService(db)
    return await campaign_service.update_encounter(
        campaign_id, encounter_id, str(current_user.id), updates
    )


@router.delete("/{campaign_id}/encounters/{encounter_id}", response_model=CampaignSchema)
async def delete_encounter(
        campaign_id: str = Path(..., title="ID da campanha"),
        encounter_id: str = Path(..., title="ID do encontro"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Remove um encontro de uma campanha.

    O usuário deve ser o DM da campanha.
    """
    campaign_service = CampaignService(db)
    return await campaign_service.delete_encounter(
        campaign_id, encounter_id, str(current_user.id)
    )


@router.post("/{campaign_id}/active-encounter/{encounter_id}", response_model=CampaignSchema)
async def set_active_encounter(
        campaign_id: str = Path(..., title="ID da campanha"),
        encounter_id: str = Path(..., title="ID do encontro"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Define um encontro como ativo na campanha.

    O usuário deve ser o DM da campanha.
    """
    campaign_service = CampaignService(db)
    return await campaign_service.set_active_encounter(
        campaign_id, encounter_id, str(current_user.id)
    )


@router.delete("/{campaign_id}/active-encounter", response_model=CampaignSchema)
async def clear_active_encounter(
        campaign_id: str = Path(..., title="ID da campanha"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Remove o encontro ativo da campanha.

    O usuário deve ser o DM da campanha.
    """
    campaign_service = CampaignService(db)
    return await campaign_service.clear_active_encounter(
        campaign_id, str(current_user.id)
    )


@router.post("/{campaign_id}/images", response_model=Dict[str, Any])
async def upload_image(
        campaign_id: str = Path(..., title="ID da campanha"),
        file: UploadFile = File(...),
        name: str = Form(...),
        description: Optional[str] = Form(None),
        tags: str = Form(""),
        is_map: bool = Form(False),
        grid_enabled: bool = Form(False),
        grid_size: Optional[int] = Form(None),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Faz upload de uma imagem para uma campanha.

    O usuário deve ser o DM da campanha.
    """
    # Processar tags como lista
    tags_list = [t.strip() for t in tags.split(",")] if tags else []

    image_service = ImageService(db)
    return await image_service.upload_image(
        campaign_id=campaign_id,
        user_id=str(current_user.id),
        file=file,
        name=name,
        description=description,
        tags=tags_list,
        is_map=is_map,
        grid_enabled=grid_enabled,
        grid_size=grid_size if grid_enabled and grid_size else None
    )


@router.get("/{campaign_id}/images", response_model=List[ImageSchema])
async def list_images(
        campaign_id: str = Path(..., title="ID da campanha"),
        tags: Optional[str] = Query(None, title="Filtrar por tags (separadas por vírgula)"),
        is_map: Optional[bool] = Query(None, title="Filtrar por tipo de imagem (mapa)"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Lista as imagens de uma campanha.

    O usuário deve ser o DM ou um jogador da campanha.
    """
    # Processar tags como lista
    tags_list = [t.strip() for t in tags.split(",")] if tags else None

    image_service = ImageService(db)
    return await image_service.list_images(
        campaign_id=campaign_id,
        user_id=str(current_user.id),
        tags=tags_list,
        is_map=is_map
    )


@router.delete("/{campaign_id}/images/{image_id}", response_model=Dict[str, Any])
async def delete_image(
        campaign_id: str = Path(..., title="ID da campanha"),
        image_id: str = Path(..., title="ID da imagem"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Exclui uma imagem de uma campanha.

    O usuário deve ser o DM da campanha.
    """
    image_service = ImageService(db)
    return await image_service.delete_image(
        campaign_id=campaign_id,
        image_id=image_id,
        user_id=str(current_user.id)
    )


@router.put("/{campaign_id}/images/{image_id}", response_model=ImageSchema)
async def update_image_metadata(
        updates: Dict[str, Any] = Body(...),
        campaign_id: str = Path(..., title="ID da campanha"),
        image_id: str = Path(..., title="ID da imagem"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Atualiza os metadados de uma imagem.

    O usuário deve ser o DM da campanha.
    Apenas os campos especificados serão atualizados.
    """
    image_service = ImageService(db)
    return await image_service.update_image_metadata(
        campaign_id=campaign_id,
        image_id=image_id,
        user_id=str(current_user.id),
        updates=updates
    )


@router.post("/{campaign_id}/images/{image_id}/share", response_model=Dict[str, Any])
async def share_image(
        campaign_id: str = Path(..., title="ID da campanha"),
        image_id: str = Path(..., title="ID da imagem"),
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Compartilha uma imagem com os jogadores da campanha.

    O usuário deve ser o DM da campanha.
    """
    image_service = ImageService(db)
    return await image_service.share_image(
        campaign_id=campaign_id,
        image_id=image_id,
        user_id=str(current_user.id)
    )