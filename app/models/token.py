# app/models/token.py
from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    username: str
    role: str


class TokenData(BaseModel):
    user_id: str = None