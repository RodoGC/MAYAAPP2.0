import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_test_user():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client[os.environ['DB_NAME']]
    
    email = "rgironcoronel@gmail.com"
    password = "12345678"  # La contraseña que se ve en la imagen
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email})
    
    if existing_user:
        print(f"Usuario {email} ya existe")
        print(f"ID: {existing_user['_id']}")
    else:
        # Create user
        hashed_password = pwd_context.hash(password)
        from datetime import datetime
        user_doc = {
            "email": email,
            "username": "Rodrigo",
            "password": hashed_password,
            "xp": 0,
            "lives": 5,
            "streak": 0,
            "last_activity": datetime.utcnow(),
            "created_at": datetime.utcnow()
        }
        
        result = await db.users.insert_one(user_doc)
        print(f"Usuario creado: {email}")
        print(f"ID: {result.inserted_id}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_user())
