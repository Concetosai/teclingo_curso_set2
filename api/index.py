from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import course_router

app = FastAPI(
    title="TECLINGO AI Engine",
    version="1.0.0",
    description="API para el Curso MCER y Base de Conocimiento de Gramática"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(course_router.router)


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/api")
def api_root():
    return {"message": "TECLINGO AI Backend is running!"}
