import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def show_database():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client[db_name]
    
    print("=" * 80)
    print(f"📊 BASE DE DATOS: {db_name}")
    print("=" * 80)
    print()
    
    # List all collections
    collections = await db.list_collection_names()
    print(f"📁 Colecciones encontradas: {len(collections)}")
    print(f"   {', '.join(collections)}")
    print()
    
    # Show users collection
    if 'users' in collections:
        print("=" * 80)
        print("👥 COLECCIÓN: users")
        print("=" * 80)
        users_count = await db.users.count_documents({})
        print(f"Total de usuarios: {users_count}")
        print()
        
        users = await db.users.find({}).to_list(100)
        for i, user in enumerate(users, 1):
            print(f"\n--- Usuario {i} ---")
            print(f"ID: {user['_id']}")
            print(f"Email: {user.get('email', 'N/A')}")
            print(f"Username: {user.get('username', 'N/A')}")
            print(f"XP: {user.get('xp', 0)}")
            print(f"Vidas: {user.get('lives', 5)}")
            print(f"Racha: {user.get('streak', 0)} días")
            print(f"Nivel: {user.get('level', 1)}")
            if user.get('last_activity'):
                print(f"Última actividad: {user['last_activity']}")
            if user.get('created_at'):
                print(f"Creado: {user['created_at']}")
    
    # Show progress collection
    if 'progress' in collections:
        print("\n" + "=" * 80)
        print("📈 COLECCIÓN: progress")
        print("=" * 80)
        progress_count = await db.progress.count_documents({})
        print(f"Total de registros de progreso: {progress_count}")
        print()
        
        progress_docs = await db.progress.find({}).to_list(100)
        
        # Group by user
        user_progress = {}
        for prog in progress_docs:
            user_id = prog.get('user_id')
            if user_id not in user_progress:
                user_progress[user_id] = []
            user_progress[user_id].append(prog)
        
        for user_id, progs in user_progress.items():
            print(f"\n--- Progreso del usuario: {user_id} ---")
            print(f"Lecciones completadas: {len([p for p in progs if p.get('completed')])}/{len(progs)}")
            
            for prog in progs[:5]:  # Show first 5 lessons
                status = "✅ Completada" if prog.get('completed') else "⏳ En progreso"
                print(f"  Lección {prog.get('lesson_id')}: {status}")
                if prog.get('score') is not None:
                    print(f"    Score: {prog.get('score')}")
                if prog.get('attempts'):
                    print(f"    Intentos: {prog.get('attempts')}")
            
            if len(progs) > 5:
                print(f"  ... y {len(progs) - 5} lecciones más")
    
    # Database statistics
    print("\n" + "=" * 80)
    print("📊 ESTADÍSTICAS GENERALES")
    print("=" * 80)
    
    if 'users' in collections:
        total_xp = sum(user.get('xp', 0) for user in users)
        avg_xp = total_xp / len(users) if users else 0
        print(f"XP total de todos los usuarios: {total_xp}")
        print(f"XP promedio por usuario: {avg_xp:.2f}")
    
    if 'progress' in collections:
        completed_lessons = len([p for p in progress_docs if p.get('completed')])
        total_lessons = len(progress_docs)
        completion_rate = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0
        print(f"Lecciones completadas: {completed_lessons}/{total_lessons} ({completion_rate:.1f}%)")
    
    print("\n" + "=" * 80)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(show_database())
