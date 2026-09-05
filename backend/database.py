import sqlite3

#DATABASE_NAME = "polls.db"

class PollNotFound(Exception):
    pass
class PollOptionNotFound(Exception):
    pass
class OptionNotFromPoll(Exception):
    pass

def execute_sql(sql_statement: str, database_path: str, fetch="fetch_all", args=tuple()) -> dict:
    connection = sqlite3.connect(database_path)
    
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.execute(sql_statement, args)
    output = cursor.fetchall() if fetch == "fetch_all" else cursor.fetchone()
    connection.commit()
    c = cursor
    cursor.close()
    return {
        "output": output, # type: ignore
        "rows_affected": c.rowcount,
        "new_inserted_id": c.lastrowid
    }

def init_db(db_name):
    polls = """CREATE TABLE IF NOT EXISTS polls (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    total_answers INTEGER DEFAULT 0
                )"""
    options = """CREATE TABLE IF NOT EXISTS options (
                    id INTEGER PRIMARY KEY,
                    poll_id INTEGER NOT NULL,
                    text TEXT NOT NULL,
                    description TEXT,
                    vote_count INTEGER DEFAULT 0,

                    FOREIGN KEY (poll_id) REFERENCES polls(id)
                )"""
    execute_sql(polls, db_name)
    execute_sql(options, db_name)

def create_poll(db_name, poll_name):
    sql = "INSERT INTO polls (name) VALUES (?)"
    output = execute_sql(sql, db_name, args=(poll_name,))
    return output 

def delete_poll(db_name, poll_id):
    sql = "DELETE FROM polls WHERE id=?"
    output = execute_sql(sql, db_name, args=(poll_id,))
    if output['output']:
        return output
    get_poll(db_name, poll_id) # will raise an exception if the poll can't be found

def create_option(db_name: str, poll_id: int, text: str, description: str | None):
    sql = "INSERT INTO options (poll_id, text, description) VALUES (?, ?, ?)"
    args = (poll_id, text, description)
    try:
        return execute_sql(sql, db_name, args=args)
    except sqlite3.IntegrityError: # sqlite enforces the FOREIGN KEY relationship
        raise PollNotFound

def get_options(db_name: str, poll_id: int):
    sql = "SELECT * FROM options WHERE poll_id=?"
    args = (poll_id,)
    output = execute_sql(sql, db_name, "fetch_all", args=args)
    if not output['output']:
        get_poll(db_name, poll_id)
    return output

def get_option(db_name: str, poll_id: int, option_id: int):
    # for submit_vote, this will check if the option exists without 
    # checking if the poll exists, which is faulty
    sql = "SELECT * FROM options WHERE id=? AND poll_id=?" 
    args = (option_id,poll_id)
    output = execute_sql(sql, db_name, "fetch_one", args=args)
    print("get_option output['output']:",output['output'])
    if not output['output']: # now we narrow it down
        # will automatically raise PollNotFound if adequate
        get_poll(db_name, poll_id)
        # if the poll exists, we'll now check if the OPTION itself exists
        sql = "SELECT * FROM options WHERE id=?"
        args = (option_id,)
        output = execute_sql(sql, db_name, "fetch_one", args=args)
        print("get_option output['output'] to check option existence:",output['output'])
        if not output['output']: # option does not exist
            raise PollOptionNotFound
        raise OptionNotFromPoll
    return output
 
def delete_option(db_name: str, poll_id: int, option_id: int):
    sql = "DELETE FROM options WHERE id=? AND poll_id=?"
    output = execute_sql(sql, db_name, args=(option_id,poll_id,))
    if not output['rows_affected']:
        get_option(db_name, poll_id, option_id)
    return output

def submit_vote(db_name: str, poll_id: int, option_id: int):
    sql = "UPDATE options SET vote_count=vote_count+1 WHERE id=? AND poll_id=? RETURNING vote_count"
    args = (option_id,poll_id)
    output=execute_sql(sql, db_name, args=args)
    # print(output,output['output'])
    if not output['rows_affected']:
        get_option(db_name, poll_id, option_id)
    execute_sql("UPDATE polls SET total_answers=total_answers+1 WHERE id=?", db_name, args=(poll_id,))
    return output

def get_polls(db_name: str):
    sql = "SELECT * FROM polls"
    return execute_sql(sql, db_name, "fetch_all")

def get_poll(db_name: str, poll_id: int):
    sql = "SELECT * FROM polls WHERE id=?"
    args = (poll_id,)
    output = execute_sql(sql, db_name, "fetch_one", args=args)
    if output['output']:
        return output
    raise PollNotFound

def get_votes(db_name: str, poll_id: int):
    #sql = "SELECT COALESCE(SUM(vote_count), 0) AS total_votes FROM options WHERE poll_id=?"
    sql = "SELECT total_answers FROM polls WHERE id=?"
    output = execute_sql(sql, db_name, fetch="fetch_one", args=(poll_id,))
    if not output['output']:
        get_poll(db_name, poll_id)
    return output
