import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from pathlib import Path
from dotenv import load_dotenv
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def import_database():
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client[db_name]

    input_file = ROOT_DIR / 'database_export.json'
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    collections = data.get('collections', {})

    if 'users' in collections:
        for user in collections['users']:
            doc = {
                '_id': ObjectId(user['id']),
                'email': user.get('email'),
                'username': user.get('username'),
                'xp': user.get('xp', 0),
                'lives': user.get('lives', 5),
                'streak': user.get('streak', 0),
                'level': user.get('level', 1),
                'last_activity': user.get('last_activity'),
                'created_at': user.get('created_at'),
            }
            try:
                await db.users.insert_one(doc)
            except Exception:
                pass

    if 'progress' in collections:
        for prog in collections['progress']:
            doc = {
                '_id': ObjectId(prog['id']),
                'user_id': prog.get('user_id'),
                'lesson_id': prog.get('lesson_id'),
                'completed': prog.get('completed', False),
                'score': prog.get('score'),
                'attempts': prog.get('attempts'),
                'completed_at': prog.get('completed_at'),
            }
            try:
                await db.progress.insert_one(doc)
            except Exception:
                pass

    client.close()

if __name__ == '__main__':
    asyncio.run(import_database())

