import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    """Public WebSocket endpoint for live broadcast of scan events and device status."""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open; receive text or ping from client if sent
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.debug("WebSocket connection error: %s", e)
        manager.disconnect(websocket)
