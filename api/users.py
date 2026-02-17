"""用户系统：注册、登录、收藏、评论"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field

from .database import _get_conn

# ── 配置 ──────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "agentstore-dev-secret-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 小时

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

router = APIRouter(tags=["users"])


# ── Pydantic 模型 ──────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=32)
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CommentRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    rating: int = Field(..., ge=1, le=5)


class UserInfo(BaseModel):
    id: int
    username: str
    created_at: str


class CommentOut(BaseModel):
    id: int
    username: str
    capability_slug: str
    content: str
    rating: int
    created_at: str


# ── 工具函数 ──────────────────────────────────────────
def _create_token(user_id: int, username: str) -> str:
    """生成 JWT token"""
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "username": username, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    """从 JWT token 解析当前用户，未登录则抛 401"""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未提供认证信息")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
        username = payload["username"]
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的 token")
    return {"id": user_id, "username": username}


# ── 认证路由 ──────────────────────────────────────────
@router.post("/api/v1/auth/register", response_model=TokenResponse)
def register(req: RegisterRequest):
    """注册新用户"""
    conn = _get_conn()
    try:
        # 检查用户名是否已存在
        existing = conn.execute(
            "SELECT id FROM users WHERE username = ?", (req.username,)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="用户名已存在")

        password_hash = pwd_context.hash(req.password)
        cursor = conn.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (req.username, password_hash),
        )
        conn.commit()
        user_id = cursor.lastrowid
    finally:
        conn.close()

    token = _create_token(user_id, req.username)
    return TokenResponse(access_token=token)


@router.post("/api/v1/auth/login", response_model=TokenResponse)
def login(req: LoginRequest):
    """用户登录"""
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT id, username, password_hash FROM users WHERE username = ?",
            (req.username,),
        ).fetchone()
    finally:
        conn.close()

    if not row or not pwd_context.verify(req.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = _create_token(row["id"], row["username"])
    return TokenResponse(access_token=token)


@router.get("/api/v1/users/me", response_model=UserInfo)
def get_me(user: dict = Depends(_get_current_user)):
    """获取当前用户信息"""
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT id, username, created_at FROM users WHERE id = ?", (user["id"],)
        ).fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="用户不存在")
    return UserInfo(id=row["id"], username=row["username"], created_at=row["created_at"])


# ── 收藏路由 ──────────────────────────────────────────
@router.post("/api/v1/favorites/{slug}")
def toggle_favorite(slug: str, user: dict = Depends(_get_current_user)):
    """收藏/取消收藏（toggle）"""
    conn = _get_conn()
    try:
        existing = conn.execute(
            "SELECT id FROM favorites WHERE user_id = ? AND capability_slug = ?",
            (user["id"], slug),
        ).fetchone()

        if existing:
            # 已收藏 → 取消
            conn.execute("DELETE FROM favorites WHERE id = ?", (existing["id"],))
            conn.commit()
            return {"action": "unfavorited", "slug": slug}
        else:
            # 未收藏 → 添加
            conn.execute(
                "INSERT INTO favorites (user_id, capability_slug) VALUES (?, ?)",
                (user["id"], slug),
            )
            conn.commit()
            return {"action": "favorited", "slug": slug}
    finally:
        conn.close()


@router.get("/api/v1/favorites")
def list_favorites(user: dict = Depends(_get_current_user)):
    """获取当前用户的收藏列表"""
    conn = _get_conn()
    try:
        rows = conn.execute(
            """SELECT f.capability_slug, f.created_at
               FROM favorites f
               WHERE f.user_id = ?
               ORDER BY f.created_at DESC""",
            (user["id"],),
        ).fetchall()
    finally:
        conn.close()

    return {
        "favorites": [
            {"slug": r["capability_slug"], "created_at": r["created_at"]}
            for r in rows
        ],
        "total": len(rows),
    }


# ── 评论路由 ──────────────────────────────────────────
@router.post("/api/v1/comments/{slug}", response_model=CommentOut)
def create_comment(slug: str, req: CommentRequest, user: dict = Depends(_get_current_user)):
    """发表评论"""
    conn = _get_conn()
    try:
        cursor = conn.execute(
            "INSERT INTO comments (user_id, capability_slug, content, rating) VALUES (?, ?, ?, ?)",
            (user["id"], slug, req.content, req.rating),
        )
        conn.commit()
        comment_id = cursor.lastrowid

        # 查询刚插入的评论
        row = conn.execute(
            """SELECT c.id, u.username, c.capability_slug, c.content, c.rating, c.created_at
               FROM comments c JOIN users u ON c.user_id = u.id
               WHERE c.id = ?""",
            (comment_id,),
        ).fetchone()
    finally:
        conn.close()

    return CommentOut(**dict(row))


@router.get("/api/v1/comments/{slug}")
def list_comments(slug: str):
    """获取指定能力的评论列表（无需登录）"""
    conn = _get_conn()
    try:
        rows = conn.execute(
            """SELECT c.id, u.username, c.capability_slug, c.content, c.rating, c.created_at
               FROM comments c JOIN users u ON c.user_id = u.id
               WHERE c.capability_slug = ?
               ORDER BY c.created_at DESC""",
            (slug,),
        ).fetchall()
    finally:
        conn.close()

    comments = [CommentOut(**dict(r)) for r in rows]
    # 计算平均评分
    avg_rating = round(sum(c.rating for c in comments) / len(comments), 1) if comments else 0
    return {"comments": comments, "total": len(comments), "avg_rating": avg_rating}
