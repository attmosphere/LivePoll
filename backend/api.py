from fastapi import FastAPI, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import database
from pathlib import Path

class PollOptionCreate(BaseModel):
    """Takes id (string), text (string) and description (string or None).
        \nBest used for creating poll options."""
    text: str
    description: str | None

class PollOptionInfo(BaseModel):
    """Takes id (integer), text (string), description (string or None) and poll_id (integer).
        \nBest used for when full information about a poll's option is needed."""
    id: int
    poll_id: int
    text: str
    description: str | None
    vote_count: int 

class PollInfo(BaseModel): 
    """Takes id (integer), name (string), total_answers (integer) and options (list of PollOptionInfo's).
        \nBest used for displaying a poll's complete information."""
    id: int
    name: str
    total_answers: int
    options: list[PollOptionInfo]

class PollOptionID(BaseModel):
    """Takes poll_id (integer) and id (integer).
        \nBest used for doing an action towards a poll option."""
    poll_id: int
    id: int

class Vote(BaseModel):
    """Takes id (integer) which is the poll option ID.
        \nBest used for submitting votes."""
    id: int 

DATABASE_NAME = f"{Path().resolve()}/polls.db"

origins = [
    "http://localhost:5000",
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://0.0.0.0:8080",
    "http://127.0.0.1:8080"
]
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
database.init_db(DATABASE_NAME)
database.execute_sql("PRAGMA journal_mode=WAL", DATABASE_NAME) # Enable WAL

def internal_error(message):
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=message)

@app.get("/")
def root():
    return {"message": "API working! :)"}

@app.get("/polls", response_model=list[PollInfo])
def get_polls():
    polls = database.get_polls(DATABASE_NAME)["output"]

    polls_and_options = []

    for poll in polls:
        options = database.get_options(
            DATABASE_NAME,
            poll["id"]
        )["output"]
        poll_data = dict(poll)
        poll_data["options"] = [dict(option) for option in options]
        polls_and_options.append(poll_data)
    return polls_and_options

@app.get("/polls/{poll_id}", response_model=PollInfo)
def get_poll(poll_id: int):
    try:
        info = database.get_poll(DATABASE_NAME, poll_id)['output']
        poll_values = dict(info)
        poll = poll_values
        options = database.get_options(DATABASE_NAME,poll_id)["output"]
        poll["options"] = [dict(option) for option in options]
        return poll
    except database.PollNotFound:
        raise HTTPException(status_code=404, detail="Poll not found")

@app.post("/polls/create", status_code=status.HTTP_201_CREATED)
def poll_create(poll_name: str):
    poll_id = database.create_poll(DATABASE_NAME, poll_name)['new_inserted_id']
    return {"message": "Poll created", "id": poll_id}

@app.delete("/polls/{poll_id}")
def delete_poll(poll_id: int):
    try:
        output = database.delete_poll(DATABASE_NAME, poll_id)
        return {"message": f"Poll {poll_id} deleted"}
    except database.PollNotFound:
        raise HTTPException(status_code=404, detail="Poll not found")
    except Exception as e:
        print(e)

@app.post("/polls/{poll_id}/options")
def add_option(poll_id: int, option: PollOptionCreate):
    try:
        description = None if not option.description else option.description
        output = database.create_option(DATABASE_NAME, poll_id, text=option.text, description=description)
        if output['rows_affected'] > 0:
            option_id = output['new_inserted_id']
            return {"message": "Option created", "id": option_id}
        internal_error("Poll could not be created")
    except database.PollNotFound:
        raise HTTPException(status_code=404, detail="Poll not found")

@app.get("/polls/{poll_id}/options", response_model=list[PollOptionInfo])
def get_options(poll_id: int):
    try:
        options = database.get_options(DATABASE_NAME, poll_id)['output']
        return [dict(row) for row in options]
    except database.PollNotFound:
        raise HTTPException(status_code=404, detail="Poll not found")
@app.delete("/polls/{poll_id}/options/{option_id}")
def delete_option(poll_id: int, option_id: int):
    try:
        database.delete_option(DATABASE_NAME, poll_id, option_id)
        return {"message": f"Option {option_id} deleted"}
    except database.PollNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Poll not found")
    except database.PollOptionNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Poll option not found")
    except database.OptionNotFromPoll:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"Option {option_id} doesn't belong in poll {poll_id}")
@app.post("/polls/{poll_id}/votes")
def submit_vote(poll_id: int, option_id: Vote): # body: {"poll_id":0,"id":1}
    try:
        output = database.submit_vote(DATABASE_NAME, poll_id, option_id.id)["output"]
        if output: # submit_vote will return the amount of votes, if the amount is 0 right after we just voted 
            return {"message": "Vote recorded"} 
        #internal_error("Vote could not be submitted")
    except database.PollNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Poll not found")
    except database.PollOptionNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Poll option {option_id.id} not found")
    except database.OptionNotFromPoll:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"Poll option {option_id.id} doesn't belong to poll {poll_id}")
    
@app.get("/polls/{poll_id}/votes")
def get_votes(poll_id: int):
    try:
        votes = database.get_votes(DATABASE_NAME, poll_id)['output'] 
        total_votes = votes["total_answers"]
        return {"votes": total_votes}
    except database.PollNotFound:
        raise HTTPException(status_code=404, detail="Poll not found")