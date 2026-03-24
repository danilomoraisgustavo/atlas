from collections import defaultdict
from fastapi import WebSocket
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if websocket in self.active_connections.get(user_id, []):
            self.active_connections[user_id].remove(websocket)

    async def send_personal_message(self, user_id: int, message: dict):
        for connection in list(self.active_connections.get(user_id, [])):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(user_id, connection)

manager = ConnectionManager()
