import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv
import json

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def export_database():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client[db_name]
    
    result = {
        "database": db_name,
        "collections": {},
        "statistics": {}
    }
    
    # Get collections
    collections = await db.list_collection_names()
    result["collections_list"] = collections
    
    # Export users
    if 'users' in collections:
        users = await db.users.find({}).to_list(100)
        result["collections"]["users"] = []
        for user in users:
            user_data = {
                "id": str(user['_id']),
                "email": user.get('email'),
                "username": user.get('username'),
                "xp": user.get('xp', 0),
                "lives": user.get('lives', 5),
                "streak": user.get('streak', 0),
                "level": user.get('level', 1),
                "last_activity": str(user.get('last_activity')) if user.get('last_activity') else None,
                "created_at": str(user.get('created_at')) if user.get('created_at') else None
            }
            result["collections"]["users"].append(user_data)
        
        result["statistics"]["total_users"] = len(users)
        result["statistics"]["total_xp"] = sum(u.get('xp', 0) for u in users)
    
    # Export progress
    if 'progress' in collections:
        progress_docs = await db.progress.find({}).to_list(1000)
        result["collections"]["progress"] = []
        for prog in progress_docs:
            prog_data = {
                "id": str(prog['_id']),
                "user_id": prog.get('user_id'),
                "lesson_id": prog.get('lesson_id'),
                "completed": prog.get('completed', False),
                "score": prog.get('score'),
                "attempts": prog.get('attempts'),
                "completed_at": str(prog.get('completed_at')) if prog.get('completed_at') else None
            }
            result["collections"]["progress"].append(prog_data)
        
        result["statistics"]["total_progress_records"] = len(progress_docs)
        result["statistics"]["completed_lessons"] = len([p for p in progress_docs if p.get('completed')])
    
    # Save to JSON file
    output_file = ROOT_DIR / 'database_export.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Base de datos exportada a: {output_file}")
    print(f"📊 Total de usuarios: {result['statistics'].get('total_users', 0)}")
    print(f"📈 Total de registros de progreso: {result['statistics'].get('total_progress_records', 0)}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(export_database())
