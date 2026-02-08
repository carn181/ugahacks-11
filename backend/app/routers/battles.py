from fastapi import APIRouter, HTTPException, status
from typing import List
from uuid import UUID
from datetime import datetime

from app.database import database
from app.schemas.schemas import BattleReport, BattleLog

router = APIRouter()


@router.post("/battle/report")
async def report_battle(battle_data: BattleReport):
    # Validate that all players exist
    players_query = """
    SELECT id, name FROM profiles 
    WHERE id IN (:attacker_id, :defender_id, :winner_id)
    """
    
    results = await database.fetch_all(players_query, {
        "attacker_id": battle_data.attacker_id,
        "defender_id": battle_data.defender_id,
        "winner_id": battle_data.winner_id
    })
    
    if len(results) != 3:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more players not found"
        )
    
    # Validate that winner is either attacker or defender
    if battle_data.winner_id not in [battle_data.attacker_id, battle_data.defender_id]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Winner must be either attacker or defender"
        )
    
    # Record the battle
    insert_query = """
    INSERT INTO battle_logs (attacker_id, defender_id, winner_id, created_at)
    VALUES (:attacker_id, :defender_id, :winner_id, NOW())
    RETURNING id
    """
    
    result = await database.fetch_one(insert_query, {
        "attacker_id": battle_data.attacker_id,
        "defender_id": battle_data.defender_id,
        "winner_id": battle_data.winner_id
    })
    
    # Update player stats
    await update_player_stats(battle_data)
    
    return {"status": "recorded", "battle_id": result["id"]}


@router.get("/player/{player_id}/battles", response_model=List[BattleLog])
async def get_player_battles(player_id: UUID, limit: int = 50):
    query = """
    SELECT id, attacker_id, defender_id, winner_id, created_at
    FROM battle_logs 
    WHERE attacker_id = :player_id OR defender_id = :player_id
    ORDER BY created_at DESC
    LIMIT :limit
    """
    
    results = await database.fetch_all(query, {
        "player_id": player_id,
        "limit": limit
    })
    
    battles = []
    for result in results:
        battles.append(BattleLog(
            id=result["id"],
            attacker_id=result["attacker_id"],
            defender_id=result["defender_id"],
            winner_id=result["winner_id"],
            created_at=result["created_at"]
        ))
    
    return battles


@router.get("/battle/recent")
async def get_recent_battles(limit: int = 20):
    query = """
    SELECT bl.id, bl.attacker_id, bl.defender_id, bl.winner_id, bl.created_at,
           p1.name as attacker_name,
           p2.name as defender_name,
           p3.name as winner_name
    FROM battle_logs bl
    LEFT JOIN profiles p1 ON bl.attacker_id = p1.id
    LEFT JOIN profiles p2 ON bl.defender_id = p2.id
    LEFT JOIN profiles p3 ON bl.winner_id = p3.id
    ORDER BY bl.created_at DESC
    LIMIT :limit
    """
    
    return await database.fetch_all(query, {"limit": limit})


async def update_player_stats(battle_data: BattleReport):
    """Update player wins and losses after a battle"""
    
    # Update winner
    winner_update = """
    UPDATE profiles 
    SET wins = wins + 1,
        level = CASE 
            WHEN (wins + 1) % 3 = 0 THEN level + 1 
            ELSE level 
        END
    WHERE id = :winner_id
    """
    
    await database.execute(winner_update, {"winner_id": battle_data.winner_id})
    
    # Update loser
    loser_id = (battle_data.defender_id if battle_data.winner_id == battle_data.attacker_id 
               else battle_data.attacker_id)
    
    loser_update = """
    UPDATE profiles 
    SET losses = losses + 1
    WHERE id = :loser_id
    """
    
    await database.execute(loser_update, {"loser_id": loser_id})