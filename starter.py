from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os.path
import pandas as pd
from llama_index.core import (
    VectorStoreIndex,
    StorageContext,
    load_index_from_storage,
    Document
)
from typing import Optional, List
from pydantic import BaseModel

app = FastAPI(title="Course Information API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app address
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variable to store our index
global_index = None

class QueryRequest(BaseModel):
    query: str
    max_results: Optional[int] = 10
    conversation_history: Optional[List[dict]] = []

class QueryResponse(BaseModel):
    response: str

def load_or_create_index():
    global global_index
    PERSIST_DIR = "./storage"
    
    if os.path.exists(PERSIST_DIR):
        # Load existing index
        storage_context = StorageContext.from_defaults(persist_dir=PERSIST_DIR)
        global_index = load_index_from_storage(storage_context)
    else:
        documents = []
        
        # 1. Load course catalog
        df_courses = pd.read_csv("data/spring2025courses.csv")
        for _, row in df_courses.iterrows():
            text = f"Course: {row['Course Code']} - {row['Title']}\n"
            text += f"Description: {row['Description']}\n"
            text += f"Units: {row['Units']}\n"
            text += f"Schedule: {row['Days']} {row['Time']}\n"
            text += f"Location: {row['Location']}\n"
            text += f"Instructors: {row['Instructors']}\n"
            text += f"GERs: {row['GERs']}\n"
            text += f"Grading: {row['Grading']}\n"
            text += f"Component: {row['Component']}\n"
            text += f"Final Exam: {row['Final Exam']}\n"
            
            doc = Document(
                text=text,
                metadata={
                    "document_type": "course_catalog",
                    "semester": "Spring 2025",
                    "course_code": row['Course Code'],
                    "title": row['Title'],
                    "units": row['Units'],
                    "instructors": row['Instructors'],
                    "gers": row['GERs'],
                }
            )
            documents.append(doc)
        
        # 2. Load major requirements
        major_reqs_dir = "data/major_requirements"
        if os.path.exists(major_reqs_dir):
            for filename in os.listdir(major_reqs_dir):
                if filename.endswith(".txt"):
                    major_name = filename.replace(".txt", "").replace("_", " ")
                    with open(os.path.join(major_reqs_dir, filename), 'r') as f:
                        content = f.read()
                        doc = Document(
                            text=content,
                            metadata={
                                "document_type": "major_requirement",
                                "major": major_name,
                                "source": filename
                            }
                        )
                        documents.append(doc)

        # 3. Load 4-year plans
        plans_dir = "data/four_year_plans"
        if os.path.exists(plans_dir):
            for filename in os.listdir(plans_dir):
                if filename.endswith(".txt"):
                    major_name = filename.replace(".txt", "").replace("_", " ")
                    with open(os.path.join(plans_dir, filename), 'r') as f:
                        content = f.read()
                        doc = Document(
                            text=content,
                            metadata={
                                "document_type": "four_year_plan",
                                "major": major_name,
                                "source": filename
                            }
                        )
                        documents.append(doc)

        # 4. Load graduation requirements
        grad_reqs_file = "data/graduation_requirements.txt"
        if os.path.exists(grad_reqs_file):
            with open(grad_reqs_file, 'r') as f:
                content = f.read()
                doc = Document(
                    text=content,
                    metadata={
                        "document_type": "graduation_requirement",
                        "source": "graduation_requirements.txt"
                    }
                )
                documents.append(doc)

        # Create and store index
        global_index = VectorStoreIndex.from_documents(documents)
        global_index.storage_context.persist(persist_dir=PERSIST_DIR)

@app.on_event("startup")
async def startup_event():
    load_or_create_index()

@app.post("/query", response_model=QueryResponse)
async def query_information(request: QueryRequest):
    if global_index is None:
        raise HTTPException(status_code=500, detail="Index not initialized")
    
    # Build context from conversation history
    context = ""
    if request.conversation_history:
        for msg in request.conversation_history[:-1]:  # Exclude the current query
            role = "User" if msg["role"] == "user" else "Assistant"
            context += f"{role}: {msg['content']}\n"
    
    # Add context to the query if it exists
    query = request.query
    if context:
        query = f"Previous conversation:\n{context}\nCurrent question: {query}"
    
    query_engine = global_index.as_query_engine(
        response_mode="tree_summarize",
        similarity_top_k=request.max_results,
    )
    
    response = query_engine.query(query)
    return QueryResponse(response=str(response))

@app.get("/available-majors")
async def get_majors():
    major_reqs_dir = "data/major_requirements"
    if not os.path.exists(major_reqs_dir):
        return {"majors": []}
    
    majors = [f.replace(".txt", "").replace("_", " ") 
              for f in os.listdir(major_reqs_dir) 
              if f.endswith(".txt")]
    return {"majors": majors}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "index_loaded": global_index is not None}
