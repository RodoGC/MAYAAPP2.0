from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from bson import ObjectId
import requests
from fastapi.responses import StreamingResponse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("SECRET_KEY", "maay-app-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============= MODELS =============

class UserSignup(BaseModel):
    email: EmailStr
    password: str
    username: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    xp: int
    lives: int
    streak: int
    level: int
    profile_image_url: Optional[str] = None

class LessonProgress(BaseModel):
    lesson_id: str
    score: int
    xp_earned: int

class ReviewLesson(BaseModel):
    lesson_id: str

# ============= MAYA LANGUAGE CONTENT =============

MAYA_LESSONS = [
    # UNIT 1: GREETINGS (5 lessons)
    {
        "id": "u1l1",
        "unit": 1,
        "unit_title": "Saludos",
        "order": 1,
        "title": "Saludos Básicos",
        "description": "Aprende los saludos básicos en Maya",
        "xp_reward": 10,
        "exercises": [
            {
                "type": "translate",
                "question": "¿Cómo se dice 'Hola' en Maya?",
                "options": ["Ba'ax ka wa'alik", "Nib óolal", "Tu'ux ka bin", "Mix ba'al"],
                "correct_answer": "Ba'ax ka wa'alik",
                "audio_file": "baax_ka_waalik.mp3"
            },
            {
                "type": "multiple_choice",
                "question": "¿Qué significa 'Nib óolal'?",
                "options": ["Hola", "Adiós", "Gracias", "Por favor"],
                "correct_answer": "Gracias"
            },
            {
                "type": "matching",
                "question": "Empareja las palabras",
                "pairs": [
                    {"maya": "Ba'ax ka wa'alik", "spanish": "Hola"},
                    {"maya": "Nib óolal", "spanish": "Gracias"},
                    {"maya": "Mix ba'al", "spanish": "De nada"}
                ],
                "correct_answer": "matched"
            }
        ]
    },
    {
        "id": "u1l2",
        "unit": 1,
        "unit_title": "Saludos",
        "order": 2,
        "title": "Cómo estás",
        "description": "Pregunta y responde cómo estás",
        "xp_reward": 10,
        "exercises": [
            {
                "type": "translate",
                "question": "Traduce al Maya: '¿Cómo estás?'",
                "options": ["Bix a beel", "Ba'ax ka wa'alik", "Tu'ux ka bin", "Jach ki'"],
                "correct_answer": "Bix a beel"
            },
            {
                "type": "multiple_choice",
                "question": "'Jach ki' significa...",
                "options": ["Muy bien", "Mal", "Regular", "Gracias"],
                "correct_answer": "Muy bien"
            },
            {
                "type": "translate",
                "question": "¿Cómo se dice 'Estoy bien' en Maya?",
                "options": ["Ma'alob", "Ko'oten", "Jach ki'", "Mix ba'al"],
                "correct_answer": "Ma'alob"
            }
        ]
    },
    {
        "id": "u1l3",
        "unit": 1,
        "unit_title": "Saludos",
        "order": 3,
        "title": "Despedidas",
        "description": "Aprende a despedirte",
        "xp_reward": 10,
        "exercises": [
            {
                "type": "translate",
                "question": "Traduce: 'Adiós'",
                "options": ["Jach ki'", "Jéetel u k'iin sáamal", "Ba'ax ka wa'alik", "Xen ich utsil"],
                "correct_answer": "Xen ich utsil"
            },
            {
                "type": "multiple_choice",
                "question": "¿Qué significa 'Jéetel u k'iin sáamal'?",
                "options": ["Buenas noches", "Hasta mañana", "Buenas tardes", "Adiós"],
                "correct_answer": "Hasta mañana"
            },
            {
                "type": "matching",
                "question": "Empareja",
                "pairs": [
                    {"maya": "Xen ich utsil", "spanish": "Adiós"},
                    {"maya": "Jéetel u k'iin sáamal", "spanish": "Hasta mañana"},
                    {"maya": "Ko'ox", "spanish": "Vamos"}
                ],
                "correct_answer": "matched"
            }
        ]
    },
    {
        "id": "u1l4",
        "unit": 1,
        "unit_title": "Saludos",
        "order": 4,
        "title": "Por favor y perdón",
        "description": "Expresiones de cortesía",
        "xp_reward": 10,
        "exercises": [
            {
                "type": "translate",
                "question": "'Por favor' en Maya es...",
                "options": ["Meentik a wich", "Nib óolal", "P'áatal", "Ma'alob"],
                "correct_answer": "Meentik a wich"
            },
            {
                "type": "multiple_choice",
                "question": "¿Cómo pedir perdón?",
                "options": ["P'áatal", "Nib óolal", "Mix ba'al", "Ko'ox"],
                "correct_answer": "P'áatal"
            },
            {
                "type": "translate",
                "question": "Traduce: 'Disculpa'",
                "options": ["P'áatal", "Meentik a wich", "Bix a beel", "Xen ich utsil"],
                "correct_answer": "P'áatal"
            }
        ]
    },
    {
        "id": "u1l5",
        "unit": 1,
        "unit_title": "Saludos",
        "order": 5,
        "title": "Repaso de Saludos",
        "description": "Practica todo lo aprendido",
        "xp_reward": 15,
        "exercises": [
            {
                "type": "matching",
                "question": "Empareja todas las expresiones",
                "pairs": [
                    {"maya": "Ba'ax ka wa'alik", "spanish": "Hola"},
                    {"maya": "Nib óolal", "spanish": "Gracias"},
                    {"maya": "Xen ich utsil", "spanish": "Adiós"},
                    {"maya": "P'áatal", "spanish": "Perdón"}
                ],
                "correct_answer": "matched"
            },
            {
                "type": "translate",
                "question": "'¿Cómo estás?' en Maya",
                "options": ["Bix a beel", "Ba'ax ka wa'alik", "Ma'alob", "Jach ki'"],
                "correct_answer": "Bix a beel"
            },
            {
                "type": "multiple_choice",
                "question": "Si alguien te ayuda, dices...",
                "options": ["Nib óolal", "P'áatal", "Mix ba'al", "Ko'ox"],
                "correct_answer": "Nib óolal"
            }
        ]
    },
    # UNIT 2: NUMBERS (3 lessons)
    {
        "id": "u2l1",
        "unit": 2,
        "unit_title": "Números",
        "order": 1,
        "title": "Números 1-5",
        "description": "Aprende los primeros números",
        "xp_reward": 10,
        "exercises": [
            {
                "type": "translate",
                "question": "¿Cómo se dice 'uno' en Maya?",
                "options": ["Jum", "Ka'", "Óox", "Kan"],
                "correct_answer": "Jum"
            },
            {
                "type": "multiple_choice",
                "question": "'Ka'' significa...",
                "options": ["Uno", "Dos", "Tres", "Cuatro"],
                "correct_answer": "Dos"
            },
            {
                "type": "matching",
                "question": "Empareja los números",
                "pairs": [
                    {"maya": "Jum", "spanish": "1"},
                    {"maya": "Ka'", "spanish": "2"},
                    {"maya": "Óox", "spanish": "3"}
                ],
                "correct_answer": "matched"
            }
        ]
    },
    {
        "id": "u2l2",
        "unit": 2,
        "unit_title": "Números",
        "order": 2,
        "title": "Números 6-10",
        "description": "Continúa con más números",
        "xp_reward": 10,
        "exercises": [
            {
                "type": "translate",
                "question": "'Seis' en Maya es...",
                "options": ["Wakak", "Jo'", "Kan", "Láhun"],
                "correct_answer": "Wakak"
            },
            {
                "type": "multiple_choice",
                "question": "¿Qué número es 'Láhun'?",
                "options": ["Ocho", "Nueve", "Diez", "Siete"],
                "correct_answer": "Diez"
            },
            {
                "type": "matching",
                "question": "Empareja",
                "pairs": [
                    {"maya": "Wakak", "spanish": "6"},
                    {"maya": "Wuk", "spanish": "7"},
                    {"maya": "Láhun", "spanish": "10"}
                ],
                "correct_answer": "matched"
            }
        ]
    },
    {
        "id": "u2l3",
        "unit": 2,
        "unit_title": "Números",
        "order": 3,
        "title": "Repaso de Números",
        "description": "Practica todos los números",
        "xp_reward": 15,
        "exercises": [
            {
                "type": "matching",
                "question": "Empareja todos los números",
                "pairs": [
                    {"maya": "Jum", "spanish": "1"},
                    {"maya": "Ka'", "spanish": "2"},
                    {"maya": "Óox", "spanish": "3"},
                    {"maya": "Kan", "spanish": "4"}
                ],
                "correct_answer": "matched"
            },
            {
                "type": "translate",
                "question": "Traduce 'cinco'",
                "options": ["Jo'", "Kan", "Óox", "Wakak"],
                "correct_answer": "Jo'"
            },
            {
                "type": "multiple_choice",
                "question": "¿Qué es 'Waxak'?",
                "options": ["Seis", "Siete", "Ocho", "Nueve"],
                "correct_answer": "Ocho"
            }
        ]
    },
    # UNIT 3: COLORS (3 lessons)
    {
        "id": "u3l1",
        "unit": 3,
        "unit_title": "Colores",
        "order": 1,
        "title": "Colores Básicos 1",
        "description": "Aprende los colores principales",
        "xp_reward": 10,
        "exercises": [
            {
                "type": "translate",
                "question": "'Rojo' en Maya es...",
                "options": ["Chak", "Sak", "K'an", "Box"],
                "correct_answer": "Chak"
            },
            {
                "type": "multiple_choice",
                "question": "¿Qué color es 'Sak'?",
                "options": ["Rojo", "Blanco", "Negro", "Amarillo"],
                "correct_answer": "Blanco"
            },
            {
                "type": "matching",
                "question": "Empareja los colores",
                "pairs": [
                    {"maya": "Chak", "spanish": "Rojo"},
                    {"maya": "Sak", "spanish": "Blanco"},
                    {"maya": "Box", "spanish": "Negro"}
                ],
                "correct_answer": "matched"
            }
        ]
    },
    {
        "id": "u3l2",
        "unit": 3,
        "unit_title": "Colores",
        "order": 2,
        "title": "Colores Básicos 2",
        "description": "Más colores en Maya",
        "xp_reward": 10,
        "exercises": [
            {
                "type": "translate",
                "question": "'Verde' en Maya",
                "options": ["Ya'ax", "K'an", "Chak", "Ek'"],
                "correct_answer": "Ya'ax"
            },
            {
                "type": "multiple_choice",
                "question": "'K'an' significa...",
                "options": ["Verde", "Amarillo", "Azul", "Rojo"],
                "correct_answer": "Amarillo"
            },
            {
                "type": "translate",
                "question": "Traduce 'azul'",
                "options": ["Ek'", "Ya'ax", "Chak", "Sak"],
                "correct_answer": "Ya'ax"
            }
        ]
    },
    {
        "id": "u3l3",
        "unit": 3,
        "unit_title": "Colores",
        "order": 3,
        "title": "Repaso de Colores",
        "description": "Practica todos los colores",
        "xp_reward": 15,
        "exercises": [
            {
                "type": "matching",
                "question": "Empareja todos",
                "pairs": [
                    {"maya": "Chak", "spanish": "Rojo"},
                    {"maya": "Sak", "spanish": "Blanco"},
                    {"maya": "K'an", "spanish": "Amarillo"},
                    {"maya": "Box", "spanish": "Negro"}
                ],
                "correct_answer": "matched"
            },
            {
                "type": "translate",
                "question": "'Verde' es...",
                "options": ["Ya'ax", "K'an", "Ek'", "Chak"],
                "correct_answer": "Ya'ax"
            },
            {
                "type": "multiple_choice",
                "question": "El cielo es azul: 'Ka'an ti' ...",
                "options": ["Ya'ax", "Sak", "Box", "K'an"],
                "correct_answer": "Ya'ax"
            }
        ]
    },
    # UNIT 4: FAMILY (4 lessons)
    {
        "id": "u4l1",
        "unit": 4,
        "unit_title": "Familia",
        "order": 1,
        "title": "Padres y Hermanos",
        "description": "Aprende sobre la familia",
        "xp_reward": 10,
        "exercises": [
            {
                "type": "translate",
                "question": "'Padre' en Maya es...",
                "options": ["Taata", "Maama", "Suku'un", "Iits'in"],
                "correct_answer": "Taata"
            },
            {
                "type": "multiple_choice",
                "question": "'Maama' significa...",
                "options": ["Padre", "Madre", "Hermano", "Hermana"],
                "correct_answer": "Madre"
            },
            {
                "type": "matching",
                "question": "Empareja",
                "pairs": [
                    {"maya": "Taata", "spanish": "Padre"},
                    {"maya": "Maama", "spanish": "Madre"},
                    {"maya": "Suku'un", "spanish": "Hermano mayor"}
                ],
                "correct_answer": "matched"
            }
        ]
    },
    {
        "id": "u4l2",
        "unit": 4,
        "unit_title": "Familia",
        "order": 2,
        "title": "Abuelos",
        "description": "Los mayores de la familia",
        "xp_reward": 10,
        "exercises": [
            {
                "type": "translate",
                "question": "'Abuelo' en Maya",
                "options": ["Nool", "Chich", "Taata", "Iits'in"],
                "correct_answer": "Nool"
            },
            {
                "type": "multiple_choice",
                "question": "'Chich' es...",
                "options": ["Abuelo", "Abuela", "Tío", "Tía"],
                "correct_answer": "Abuela"
            },
            {
                "type": "translate",
                "question": "Traduce 'abuela'",
                "options": ["Chich", "Nool", "Maama", "Iits'in"],
                "correct_answer": "Chich"
            }
        ]
    },
    {
        "id": "u4l3",
        "unit": 4,
        "unit_title": "Familia",
        "order": 3,
        "title": "Tíos y Primos",
        "description": "Familia extendida",
        "xp_reward": 10,
        "exercises": [
            {
                "type": "translate",
                "question": "'Tío' en Maya es...",
                "options": ["Tío (préstamo)", "Nool", "Taata", "Suku'un"],
                "correct_answer": "Tío (préstamo)"
            },
            {
                "type": "multiple_choice",
                "question": "Primo se dice...",
                "options": ["Lak'ech", "Iits'in", "Suku'un", "Ki'ichpan"],
                "correct_answer": "Lak'ech"
            },
            {
                "type": "matching",
                "question": "Empareja",
                "pairs": [
                    {"maya": "Lak'ech", "spanish": "Primo"},
                    {"maya": "Iits'in", "spanish": "Hermano menor"},
                    {"maya": "Ki'ichpan", "spanish": "Hermana"}
                ],
                "correct_answer": "matched"
            }
        ]
    },
    {
        "id": "u4l4",
        "unit": 4,
        "unit_title": "Familia",
        "order": 4,
        "title": "Repaso Familia",
        "description": "Toda la familia junta",
        "xp_reward": 15,
        "exercises": [
            {
                "type": "matching",
                "question": "Empareja toda la familia",
                "pairs": [
                    {"maya": "Taata", "spanish": "Padre"},
                    {"maya": "Maama", "spanish": "Madre"},
                    {"maya": "Nool", "spanish": "Abuelo"},
                    {"maya": "Chich", "spanish": "Abuela"}
                ],
                "correct_answer": "matched"
            },
            {
                "type": "translate",
                "question": "'Hermano mayor' es...",
                "options": ["Suku'un", "Iits'in", "Lak'ech", "Taata"],
                "correct_answer": "Suku'un"
            },
            {
                "type": "multiple_choice",
                "question": "¿Quién es 'Iits'in'?",
                "options": ["Hermano mayor", "Hermano menor", "Primo", "Tío"],
                "correct_answer": "Hermano menor"
            }
        ]
    },
    # UNIT 5: COMMON VERBS (5 lessons)
    {
        "id": "u5l1",
        "unit": 5,
        "unit_title": "Verbos Comunes",
        "order": 1,
        "title": "Verbos de Movimiento",
        "description": "Verbos básicos de acción",
        "xp_reward": 10,
        "exercises": [
            {
                "type": "translate",
                "question": "'Ir' en Maya es...",
                "options": ["Bin", "Táal", "T'aan", "Uk'ul"],
                "correct_answer": "Bin"
            },
            {
                "type": "multiple_choice",
                "question": "'Táal' significa...",
                "options": ["Ir", "Venir", "Hablar", "Comer"],
                "correct_answer": "Venir"
            },
            {
                "type": "matching",
                "question": "Empareja",
                "pairs": [
                    {"maya": "Bin", "spanish": "Ir"},
                    {"maya": "Táal", "spanish": "Venir"},
                    {"maya": "Xíimbal", "spanish": "Caminar"}
                ],
                "correct_answer": "matched"
            }
        ]
    },
    {
        "id": "u5l2",
        "unit": 5,
        "unit_title": "Verbos Comunes",
        "order": 2,
        "title": "Verbos de Comunicación",
        "description": "Hablar y escuchar",
        "xp_reward": 10,
        "exercises": [
            {
                "type": "translate",
                "question": "'Hablar' en Maya",
                "options": ["T'aan", "Uk'ul", "Bin", "Cha'ik"],
                "correct_answer": "T'aan"
            },
            {
                "type": "multiple_choice",
                "question": "'Uk'ul' significa...",
                "options": ["Hablar", "Escuchar", "Ver", "Pensar"],
                "correct_answer": "Escuchar"
            },
            {
                "type": "translate",
                "question": "Traduce 'ver'",
                "options": ["Ilik", "T'aan", "Uk'ul", "Bin"],
                "correct_answer": "Ilik"
            }
        ]
    },
    {
        "id": "u5l3",
        "unit": 5,
        "unit_title": "Verbos Comunes",
        "order": 3,
        "title": "Verbos de Necesidad",
        "description": "Comer, beber, dormir",
        "xp_reward": 10,
        "exercises": [
            {
                "type": "translate",
                "question": "'Comer' en Maya es...",
                "options": ["Janal", "Uk'ul", "Wenel", "Cha'ik"],
                "correct_answer": "Janal"
            },
            {
                "type": "multiple_choice",
                "question": "'Uk'ul' es...",
                "options": ["Comer", "Beber", "Dormir", "Despertar"],
                "correct_answer": "Beber"
            },
            {
                "type": "matching",
                "question": "Empareja",
                "pairs": [
                    {"maya": "Janal", "spanish": "Comer"},
                    {"maya": "Uk'ul", "spanish": "Beber"},
                    {"maya": "Wenel", "spanish": "Dormir"}
                ],
                "correct_answer": "matched"
            }
        ]
    },
    {
        "id": "u5l4",
        "unit": 5,
        "unit_title": "Verbos Comunes",
        "order": 4,
        "title": "Verbos de Estado",
        "description": "Ser, estar, tener",
        "xp_reward": 10,
        "exercises": [
            {
                "type": "translate",
                "question": "'Querer/Amar' en Maya",
                "options": ["Yaakun", "K'áat", "Bin", "Táal"],
                "correct_answer": "Yaakun"
            },
            {
                "type": "multiple_choice",
                "question": "'K'áat' significa...",
                "options": ["Amar", "Querer (desear)", "Tener", "Ser"],
                "correct_answer": "Querer (desear)"
            },
            {
                "type": "translate",
                "question": "'Saber' en Maya",
                "options": ["Ojel", "K'áat", "Yaakun", "T'aan"],
                "correct_answer": "Ojel"
            }
        ]
    },
    {
        "id": "u5l5",
        "unit": 5,
        "unit_title": "Verbos Comunes",
        "order": 5,
        "title": "Repaso de Verbos",
        "description": "Practica todos los verbos",
        "xp_reward": 15,
        "exercises": [
            {
                "type": "matching",
                "question": "Empareja todos",
                "pairs": [
                    {"maya": "Bin", "spanish": "Ir"},
                    {"maya": "Táal", "spanish": "Venir"},
                    {"maya": "T'aan", "spanish": "Hablar"},
                    {"maya": "Janal", "spanish": "Comer"}
                ],
                "correct_answer": "matched"
            },
            {
                "type": "translate",
                "question": "'Dormir' es...",
                "options": ["Wenel", "Uk'ul", "Ilik", "Xíimbal"],
                "correct_answer": "Wenel"
            },
            {
                "type": "multiple_choice",
                "question": "Si quieres expresar amor, usas...",
                "options": ["Yaakun", "K'áat", "Ojel", "Bin"],
                "correct_answer": "Yaakun"
            }
        ]
    }
]

# Tips for each unit
UNIT_TIPS = {
    1: {
        "title": "Consejos: Saludos en Maya",
        "grammar": [
            "El Maya Yucateco usa sonidos que no existen en español, como la oclusiva glotal (')",
            "Los saludos varían según el contexto formal o informal",
            "'Ba'ax ka wa'alik' literalmente significa '¿qué dices?' y es un saludo informal común.",
            "Para responder a 'Ba'ax ka wa'alik', puedes decir 'Ma'alob' (Bien) o 'Mix ba'al' (Nada nuevo)."
        ],
        "pronunciation": [
            "' (apóstrofe): representa una pausa glotal, un corte repentino de aire (como en 'uh-oh').",
            "x: se pronuncia como 'sh' en inglés (ej. 'Xen' suena como 'Shen').",
            "k': se pronuncia con más fuerza que una 'k' normal, desde la garganta."
        ],
        "vocabulary": [
            "Ba'ax ka wa'alik - Hola / ¿Qué onda?",
            "Nib óolal - Gracias (literalmente 'gran corazón')",
            "Bix a beel - ¿Cómo estás? (más formal)",
            "Ma'alob - Bien / Bueno",
            "Xen ich utsil - Adiós (Que te vaya bien)"
        ]
    },
    2: {
        "title": "Consejos: Números en Maya",
        "grammar": [
            "El sistema numérico maya es vigesimal (base 20)",
            "Los números básicos se combinan para formar números mayores",
            "El cero fue inventado por los mayas"
        ],
        "pronunciation": [
            "': pausa glotal importante en números",
            "Jum: se pronuncia 'hum'",
            "Ka': 'ka' con pausa al final"
        ],
        "vocabulary": [
            "Jum - 1",
            "Ka' - 2",
            "Óox - 3",
            "Kan - 4",
            "Jo' - 5",
            "Wakak - 6",
            "Wuk - 7",
            "Waxak - 8",
            "Bolon - 9",
            "Láhun - 10"
        ]
    },
    3: {
        "title": "Consejos: Colores en Maya",
        "grammar": [
            "Los colores en maya tienen significados cosmológicos",
            "Los cuatro colores principales representan direcciones cardinales",
            "Chak (rojo) = Este, Sak (blanco) = Norte, Box (negro) = Oeste, K'an (amarillo) = Sur"
        ],
        "pronunciation": [
            "Ya'ax: 'yah-ash'",
            "K'an: 'k'ahn' con k' explosiva",
            "Chak: 'chahk'"
        ],
        "vocabulary": [
            "Chak - Rojo",
            "Sak - Blanco",
            "Box - Negro",
            "K'an - Amarillo",
            "Ya'ax - Verde/Azul"
        ]
    },
    4: {
        "title": "Consejos: Familia en Maya",
        "grammar": [
            "La familia es central en la cultura maya",
            "Existen términos específicos para hermanos mayores y menores",
            "El respeto a los mayores se refleja en el lenguaje"
        ],
        "pronunciation": [
            "Suku'un: 'suku-un' con pausa glotal",
            "Iits'in: 'iits-in'",
            "Nool: 'nohl'"
        ],
        "vocabulary": [
            "Taata - Padre",
            "Maama - Madre",
            "Suku'un - Hermano mayor",
            "Iits'in - Hermano menor",
            "Nool - Abuelo",
            "Chich - Abuela"
        ]
    },
    5: {
        "title": "Consejos: Verbos Comunes",
        "grammar": [
            "Los verbos mayas se conjugan con prefijos y sufijos",
            "El tiempo verbal se marca con partículas especiales",
            "Muchos verbos tienen raíces de dos consonantes"
        ],
        "pronunciation": [
            "T'aan: 't'ahn' con t' explosiva",
            "Uk'ul: 'u-k'ul'",
            "Xíimbal: 'shim-bal'"
        ],
        "vocabulary": [
            "Bin - Ir",
            "Táal - Venir",
            "T'aan - Hablar",
            "Uk'ul - Beber/Escuchar",
            "Janal - Comer",
            "Wenel - Dormir",
            "Ilik - Ver",
            "Yaakun - Amar"
        ]
    }
}

# Dictionary data
DICTIONARY = [
    # Greetings
    {"maya": "Ba'ax ka wa'alik", "spanish": "Hola", "category": "Saludos"},
    {"maya": "Nib óolal", "spanish": "Gracias", "category": "Saludos"},
    {"maya": "Bix a beel", "spanish": "¿Cómo estás?", "category": "Saludos"},
    {"maya": "Ma'alob", "spanish": "Bien", "category": "Saludos"},
    {"maya": "Xen ich utsil", "spanish": "Adiós", "category": "Saludos"},
    {"maya": "P'áatal", "spanish": "Perdón/Disculpa", "category": "Saludos"},
    # Numbers
    {"maya": "Jum", "spanish": "Uno", "category": "Números"},
    {"maya": "Ka'", "spanish": "Dos", "category": "Números"},
    {"maya": "Óox", "spanish": "Tres", "category": "Números"},
    {"maya": "Kan", "spanish": "Cuatro", "category": "Números"},
    {"maya": "Jo'", "spanish": "Cinco", "category": "Números"},
    {"maya": "Wakak", "spanish": "Seis", "category": "Números"},
    {"maya": "Wuk", "spanish": "Siete", "category": "Números"},
    {"maya": "Waxak", "spanish": "Ocho", "category": "Números"},
    {"maya": "Bolon", "spanish": "Nueve", "category": "Números"},
    {"maya": "Láhun", "spanish": "Diez", "category": "Números"},
    # Colors
    {"maya": "Chak", "spanish": "Rojo", "category": "Colores"},
    {"maya": "Sak", "spanish": "Blanco", "category": "Colores"},
    {"maya": "Box", "spanish": "Negro", "category": "Colores"},
    {"maya": "K'an", "spanish": "Amarillo", "category": "Colores"},
    {"maya": "Ya'ax", "spanish": "Verde/Azul", "category": "Colores"},
    # Family
    {"maya": "Taata", "spanish": "Padre", "category": "Familia"},
    {"maya": "Maama", "spanish": "Madre", "category": "Familia"},
    {"maya": "Suku'un", "spanish": "Hermano mayor", "category": "Familia"},
    {"maya": "Iits'in", "spanish": "Hermano menor", "category": "Familia"},
    {"maya": "Nool", "spanish": "Abuelo", "category": "Familia"},
    {"maya": "Chich", "spanish": "Abuela", "category": "Familia"},
    # Verbs
    {"maya": "Bin", "spanish": "Ir", "category": "Verbos"},
    {"maya": "Táal", "spanish": "Venir", "category": "Verbos"},
    {"maya": "T'aan", "spanish": "Hablar", "category": "Verbos"},
    {"maya": "Uk'ul", "spanish": "Beber/Escuchar", "category": "Verbos"},
    {"maya": "Janal", "spanish": "Comer", "category": "Verbos"},
    {"maya": "Wenel", "spanish": "Dormir", "category": "Verbos"},
    {"maya": "Ilik", "spanish": "Ver", "category": "Verbos"},
    {"maya": "Yaakun", "spanish": "Amar", "category": "Verbos"},
    {"maya": "Xíimbal", "spanish": "Caminar", "category": "Verbos"}
    ,{"maya": "Balam", "spanish": "Jaguar", "category": "Animales"}
    ,{"maya": "P'éek", "spanish": "Perro", "category": "Animales"}
    ,{"maya": "Míis", "spanish": "Gato", "category": "Animales"}
    ,{"maya": "Ch'íich", "spanish": "Pájaro", "category": "Animales"}
    ,{"maya": "Kaay", "spanish": "Pez", "category": "Animales"}
    ,{"maya": "Ha'", "spanish": "Agua", "category": "Naturaleza"}
    ,{"maya": "K'áak'", "spanish": "Fuego", "category": "Naturaleza"}
    ,{"maya": "Ik'", "spanish": "Aire", "category": "Naturaleza"}
    ,{"maya": "Lu'um", "spanish": "Tierra", "category": "Naturaleza"}
    ,{"maya": "K'iin", "spanish": "Sol", "category": "Naturaleza"}
    ,{"maya": "Uh", "spanish": "Luna", "category": "Naturaleza"}
    ,{"maya": "Ek'", "spanish": "Estrella", "category": "Naturaleza"}
    ,{"maya": "Che'", "spanish": "Árbol", "category": "Naturaleza"}
    ,{"maya": "Nikté'", "spanish": "Flor", "category": "Naturaleza"}
    ,{"maya": "Ixim", "spanish": "Maíz", "category": "Comida"}
    ,{"maya": "Waaj", "spanish": "Tortilla", "category": "Comida"}
    ,{"maya": "Naj", "spanish": "Casa", "category": "Objetos"}
    ,{"maya": "U k'áat", "spanish": "Por favor", "category": "Saludos"}
    ,{"maya": "Ma' k'áatchi'", "spanish": "De nada", "category": "Saludos"}
    ,{"maya": "Noj", "spanish": "Grande", "category": "Adjetivos"}
    ,{"maya": "Chan", "spanish": "Pequeño", "category": "Adjetivos"}
    ,{"maya": "Naj", "spanish": "Casa", "category": "Sustantivos"}
    ,{"maya": "Che'", "spanish": "Árbol", "category": "Sustantivos"}
    ,{"maya": "Uh", "spanish": "Luna", "category": "Sustantivos"}
    ,{"maya": "K'iin", "spanish": "Sol", "category": "Sustantivos"}
    ,{"maya": "Ek'", "spanish": "Estrella", "category": "Sustantivos"}
    ,{"maya": "Ma'alob k'iin", "spanish": "Buen día", "category": "Frases"}
    ,{"maya": "Mix ba'al", "spanish": "Nada (no hay problema)", "category": "Frases"}
    ,{"maya": "Jach ki'", "spanish": "Muy bien", "category": "Frases"}
    ,{"maya": "Meentik a wich", "spanish": "Por favor", "category": "Frases"}
    ,{"maya": "Ko'ox", "spanish": "Vamos", "category": "Frases"}
    ,{"maya": "Tu'ux ka bin?", "spanish": "¿A dónde vas?", "category": "Frases"}
    ,{"maya": "Ba'ax ka wa'alik?", "spanish": "¿Qué dices?", "category": "Frases"}
    ,{"maya": "Ma'alo'ob", "spanish": "Bien", "category": "Frases"}
]

# ============= HELPER FUNCTIONS =============

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def calculate_level(xp: int) -> int:
    """Calculate user level based on XP (100 XP per level)"""
    return xp // 100

# ============= AUTH ENDPOINTS =============

@api_router.post("/auth/signup", response_model=Token)
async def signup(user_data: UserSignup):
    print(f"DEBUG: Signup request received for {user_data.email}")
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user_doc = {
        "email": user_data.email,
        "username": user_data.username,
        "password": hashed_password,
        "xp": 0,
        "lives": 5,
        "streak": 0,
        "last_activity": datetime.utcnow(),
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Create token
    access_token = create_access_token(data={"sub": user_id})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    # Find user
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Update streak
    last_activity = user.get("last_activity")
    current_streak = user.get("streak", 0)
    
    if last_activity:
        days_diff = (datetime.utcnow() - last_activity).days
        if days_diff == 1:
            current_streak += 1
        elif days_diff > 1:
            current_streak = 1
    else:
        current_streak = 1
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_activity": datetime.utcnow(), "streak": current_streak}}
    )
    
    # Create token
    access_token = create_access_token(data={"sub": str(user["_id"])})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "email": current_user["email"],
        "username": current_user["username"],
        "xp": current_user.get("xp", 0),
        "lives": current_user.get("lives", 5),
        "streak": current_user.get("streak", 0),
        "level": calculate_level(current_user.get("xp", 0)),
        "profile_image_url": current_user.get("profile_image_url")
    }

# ============= AUDIO PROXY ENDPOINT =============

class SpeakRequest(BaseModel):
    text: str

@api_router.post("/speak")
async def speak_proxy(request: SpeakRequest):
    url = "https://api.cognitive.microsofttranslator.com/speak"
    params = {
        "api-version": "3.0",
        "language": "yua-MX",
        "format": "audio/mp3",
        "options": "Male"
    }
    az_key = os.getenv("AZURE_TRANSLATOR_KEY", "")
    az_region = os.getenv("AZURE_TRANSLATOR_REGION", "centralus")
    if not az_key:
        raise HTTPException(status_code=500, detail="Missing AZURE_TRANSLATOR_KEY in environment")
    headers = {
        "Ocp-Apim-Subscription-Key": az_key,
        "Ocp-Apim-Subscription-Region": az_region,
        "Content-Type": "application/json"
    }
    
    try:
        # Microsoft Translator Speak API expects body with [{"Text": "..."}]
        body = [{"Text": request.text}]
        
        # We use stream=True to pass the audio data directly to the client
        response = requests.post(url, params=params, headers=headers, json=body, stream=True)
        
        if response.status_code != 200:
            print(f"Error from Microsoft: {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Error from Microsoft API")
            
        return StreamingResponse(response.iter_content(chunk_size=1024), media_type="audio/mp3")
        
    except Exception as e:
        print(f"Proxy error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class TranslateRequest(BaseModel):
    text: str
    from_lang: str = "es"
    to_lang: str = "yua"

@api_router.post("/translate")
async def translate_proxy(request: TranslateRequest):
    url = "https://api.cognitive.microsofttranslator.com/translate"
    params = {
        "api-version": "3.0",
        "to": request.to_lang,
        "from": request.from_lang,
    }
    az_key = os.getenv("AZURE_TRANSLATOR_KEY", "")
    az_region = os.getenv("AZURE_TRANSLATOR_REGION", "centralus")
    if not az_key:
        raise HTTPException(status_code=500, detail="Missing AZURE_TRANSLATOR_KEY in environment")
    headers = {
        "Ocp-Apim-Subscription-Key": az_key,
        "Ocp-Apim-Subscription-Region": az_region,
        "Content-Type": "application/json"
    }
    try:
        body = [{"Text": request.text}]
        response = requests.post(url, params=params, headers=headers, json=body)
        if response.status_code != 200:
            print(f"Error from Microsoft: {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Error from Microsoft API")
        data = response.json()
        translated = data[0]["translations"][0]["text"] if data and data[0].get("translations") else ""
        return {"text": translated}
    except Exception as e:
        print(f"Translate proxy error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= LESSON ENDPOINTS =============

@api_router.get("/lessons")
async def get_lessons(current_user: dict = Depends(get_current_user)):
    """Get all lessons with user progress"""
    user_id = str(current_user["_id"])
    
    # Get user progress
    progress_docs = await db.progress.find({"user_id": user_id}).to_list(1000)
    progress_map = {p["lesson_id"]: p for p in progress_docs}
    
    # Organize lessons by unit
    units = {}
    for lesson in MAYA_LESSONS:
        unit_num = lesson["unit"]
        if unit_num not in units:
            units[unit_num] = {
                "unit": unit_num,
                "title": lesson["unit_title"],
                "lessons": []
            }
        
        lesson_progress = progress_map.get(lesson["id"], {})
        lesson_data = {
            "id": lesson["id"],
            "order": lesson["order"],
            "title": lesson["title"],
            "description": lesson["description"],
            "xp_reward": lesson["xp_reward"],
            "completed": lesson_progress.get("completed", False),
            "score": lesson_progress.get("score", 0),
            "locked": False  # Will calculate below
        }
        units[unit_num]["lessons"].append(lesson_data)
    
    # Calculate locked status (sequential unlocking)
    units_list = sorted(units.values(), key=lambda x: x["unit"])
    for unit in units_list:
        unit["lessons"] = sorted(unit["lessons"], key=lambda x: x["order"])
        for i, lesson in enumerate(unit["lessons"]):
            if i == 0:
                lesson["locked"] = False  # First lesson is always unlocked
            else:
                # Locked if previous lesson not completed
                prev_lesson = unit["lessons"][i - 1]
                lesson["locked"] = not prev_lesson["completed"]
    
    return units_list

@api_router.get("/lessons/{lesson_id}")
async def get_lesson(lesson_id: str, current_user: dict = Depends(get_current_user)):
    """Get specific lesson details"""
    lesson = next((l for l in MAYA_LESSONS if l["id"] == lesson_id), None)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    return lesson

@api_router.post("/lessons/{lesson_id}/complete")
async def complete_lesson(lesson_id: str, progress: LessonProgress, current_user: dict = Depends(get_current_user)):
    """Mark lesson as complete and award XP"""
    user_id = str(current_user["_id"])
    
    # Find lesson
    lesson = next((l for l in MAYA_LESSONS if l["id"] == lesson_id), None)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Update or create progress
    await db.progress.update_one(
        {"user_id": user_id, "lesson_id": lesson_id},
        {
            "$set": {
                "completed": True,
                "score": progress.score,
                "completed_at": datetime.utcnow()
            },
            "$inc": {"attempts": 1}
        },
        upsert=True
    )
    
    # Award XP
    new_xp = current_user.get("xp", 0) + progress.xp_earned
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"xp": new_xp}}
    )
    
    return {
        "success": True,
        "xp_earned": progress.xp_earned,
        "total_xp": new_xp,
        "level": calculate_level(new_xp)
    }

@api_router.post("/lessons/review")
async def review_lesson(review: ReviewLesson, current_user: dict = Depends(get_current_user)):
    """Review a completed lesson to earn back a heart"""
    user_id = str(current_user["_id"])
    
    # Check if lesson is completed
    progress = await db.progress.find_one({"user_id": user_id, "lesson_id": review.lesson_id})
    if not progress or not progress.get("completed"):
        raise HTTPException(status_code=400, detail="Can only review completed lessons")
    
    # Check current lives
    current_lives = current_user.get("lives", 5)
    if current_lives >= 5:
        raise HTTPException(status_code=400, detail="Lives are already full")
    
    # Award one heart
    new_lives = min(current_lives + 1, 5)
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"lives": new_lives}}
    )
    
    return {
        "success": True,
        "lives": new_lives,
        "message": "You earned back one heart!"
    }

@api_router.post("/lessons/lose-life")
async def lose_life(current_user: dict = Depends(get_current_user)):
    """Lose a heart for wrong answer"""
    current_lives = current_user.get("lives", 5)
    new_lives = max(current_lives - 1, 0)
    
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"lives": new_lives}}
    )
    
    return {
        "success": True,
        "lives": new_lives
    }

@api_router.post("/user/gain-life")
async def gain_life(current_user: dict = Depends(get_current_user)):
    """Gain a heart from mini-game"""
    current_lives = current_user.get("lives", 5)
    if current_lives >= 5:
        return {"success": False, "message": "Lives full", "lives": 5}
    
    new_lives = current_lives + 1
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"lives": new_lives}}
    )
    
    return {
        "success": True,
        "lives": new_lives,
        "message": "Heart gained!"
    }

# ============= TIPS ENDPOINT =============

@api_router.get("/tips/{unit}")
async def get_unit_tips(unit: int, current_user: dict = Depends(get_current_user)):
    """Get tips and grammar rules for a unit"""
    tips = UNIT_TIPS.get(unit)
    if not tips:
        raise HTTPException(status_code=404, detail="Tips not found for this unit")
    return tips

# ============= DICTIONARY ENDPOINT =============

@api_router.get("/dictionary")
async def get_dictionary(search: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get dictionary entries, optionally filtered by search"""
    if search:
        search_lower = search.lower()
        filtered = [
            entry for entry in DICTIONARY
            if search_lower in entry["maya"].lower() or search_lower in entry["spanish"].lower()
        ]
        return sorted(filtered, key=lambda e: e["maya"].lower())
    return sorted(DICTIONARY, key=lambda e: e["maya"].lower())

# ============= STATS ENDPOINT =============

@api_router.get("/user/stats")
async def get_user_stats(current_user: dict = Depends(get_current_user)):
    """Get detailed user statistics"""
    user_id = str(current_user["_id"])
    
    # Count completed lessons
    completed_count = await db.progress.count_documents({
        "user_id": user_id,
        "completed": True
    })
    
    total_lessons = len(MAYA_LESSONS)
    xp = current_user.get("xp", 0)
    
    return {
        "username": current_user["username"],
        "xp": xp,
        "level": calculate_level(xp),
        "lives": current_user.get("lives", 5),
        "streak": current_user.get("streak", 0),
        "lessons_completed": completed_count,
        "total_lessons": total_lessons,
        "progress_percentage": round((completed_count / total_lessons) * 100, 1) if total_lessons > 0 else 0
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=ROOT_DIR / "static"), name="static")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
# ============= USER PROFILE IMAGE =============

@api_router.post("/user/profile-image")
async def upload_profile_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")
    ext = ".jpg"
    if "/" in content_type:
        maybe_ext = content_type.split("/")[-1]
        if maybe_ext in ["jpeg", "jpg", "png", "webp"]:
            ext = "." + ("jpg" if maybe_ext == "jpeg" else maybe_ext)
    static_dir = ROOT_DIR / "static" / "profile_images"
    static_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{str(current_user['_id'])}{ext}"
    filepath = static_dir / filename
    data = await file.read()
    with open(filepath, "wb") as f:
        f.write(data)
    url_path = f"/static/profile_images/{filename}"
    await db.users.update_one({"_id": current_user["_id"]}, {"$set": {"profile_image_url": url_path}})
    return {"url": url_path}
