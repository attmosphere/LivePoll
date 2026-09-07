let poll_loaded = false;
const API_URL = "http://127.0.0.1:8000"

async function submitVote(pollID, optionID){
    try {
        const body = {id: optionID};
        const response = await fetch(`${API_URL}/polls/${pollID}/votes`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(body) 
        });
        if (!response.ok) {
            buildError(await response.text())
        }
        await updateVotes(pollID);
    }
    catch (e) {
        buildError(e);
    }
}
function removePollElement() {
    removeByClassIfExists("poll");
    poll_loaded = false;
}
function removeByIdIfExists(id) {
    if (document.getElementById(id)) {
        document.getElementById(id).remove();
    }
}
function removeByClassIfExists(class_name) {
    const ele = document.querySelectorAll(`.${class_name}`)
    if (ele) {
        for (let element of ele) {
            element.remove();
        }
    } 
}
async function createPoll(pollName) {
    const response = await fetch(`${API_URL}/polls/create?poll_name=${pollName}`, {method: "POST"});
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const id = data.id;
    return id;
}
async function getVotes(pollID) {
    const response = await fetch(`${API_URL}/polls/${pollID}/votes`);
    const data = await response.json();
    const votes = data.votes;
    return votes;
}
async function updateVotes(pollID) {
    const votes_element = document.getElementById("votes");
    const votes_amount = await getVotes(pollID);
    votes_element.innerText = `${votes_amount} votes`
}
function buildCreatePollForm() {
    removeByIdIfExists("createPollForm");
    removeByIdIfExists("joinPollForm");
    removeByClassIfExists("error");
    const action_buttons = document.getElementById("action_buttons");
    const createPollDiv = document.createElement("form");
    createPollDiv.id = "createPollForm";
    const pollNameLabel = document.createElement("label");
    const pollNameInput = document.createElement("input");
    const createPollButton = document.createElement("input");

    pollNameLabel.setAttribute("for", "pollName");
    pollNameLabel.textContent = "Poll Name";
    pollNameInput.type = "text";
    pollNameInput.name = "pollName";
    pollNameInput.id = "pollName";
    createPollButton.type = "button";
    createPollButton.value = "Create poll";
    createPollButton.id = "createPoll";
    createPollButton.addEventListener("click", async function() {
        const poll_name = pollNameInput.value;
        if (poll_name.length > 0){
            removePollElement();
            try {
                const poll_id = await createPoll(poll_name);
                buildPollElement({"id": poll_id, "name": poll_name, "total_answers": 0, "options": {}});
            }
            catch (e) {
                buildError(e);
            }
        }
        else {
            buildError("Poll name can't be empty!")
        }

    });

    createPollDiv.append(pollNameLabel, pollNameInput, createPollButton);
    // document.body.append(createPollDiv);
    action_buttons.after(createPollDiv);
}
function buildJoinPollForm() {
    removeByIdIfExists("joinPollForm");
    removeByIdIfExists("createPollForm");
    const action_buttons = document.getElementById("action_buttons");
    const joinPollDiv = document.createElement("form");
    joinPollDiv.id = "joinPollForm";
    const pollIdLabel = document.createElement("label");
    const pollIdInput = document.createElement("input");
    const joinPollButton = document.createElement("input");

    pollIdLabel.setAttribute("for", "pollId");
    pollIdLabel.textContent = "Poll ID";
    pollIdInput.type = "text";
    pollIdInput.name = "pollId";
    pollIdInput.id = "pollId";
    joinPollButton.id = "joinPoll";
    joinPollButton.value = "Join poll";
    joinPollButton.type = "button";

    joinPollButton.addEventListener("click", function () {
        const pollId = pollIdInput.value;
        if (pollId.length > 0){
            if (poll_loaded){
                removePollElement();
                console.log("removed poll");
            }
            getPoll(pollId);
        }
        else {
            buildError("Poll ID can't be empty!");
        }
    });
    
    joinPollDiv.append(pollIdLabel, pollIdInput, joinPollButton);
    // document.body.appendChild(joinPollDiv);
    action_buttons.after(joinPollDiv);
}
/* {
    "id": 0,
    "name": "Poll Name",
    "total_answers": 3,
    options: [{...}]
} */
function buildPollElement(pollData) {
    try {
        const poll_id = pollData.id;
        const poll_name = pollData.name;
        const votes = pollData.total_answers;   
        const options = pollData.options;

        const pollDiv = document.createElement("div");
        pollDiv.className = "poll";
        const pollId = document.createElement("span");
        pollId.id = "poll_id";
        pollId.text = "The ID number of the current poll";
        pollId.textContent = `ID: ${poll_id}`;
        const pollHeader = document.createElement("h2");
        pollHeader.id = "poll-header";
        pollHeader.textContent = poll_name;
        const pollVotes = document.createElement("p");
        pollVotes.id = "votes";
        pollVotes.textContent = `${votes} votes`;
        const optionsDiv = document.createElement("div");

        if (Object.keys(options).length > 0) {
            optionsDiv.className = "options";
            for (const option of options){
                let option_button = document.createElement("button");
                option_button.textContent = option.text;
                option_button.addEventListener("click", function (event) {
                    const button = event.target;
                    submitVote(poll_id, option.id);
                })
                
                optionsDiv.appendChild(option_button);
            }
        }

        pollDiv.append(pollHeader, pollVotes, optionsDiv, pollId);
        document.body.appendChild(pollDiv);
        poll_loaded = true;
    }
    catch (e) {
        buildError(e);
    }
}
function buildError(text) {
    const element = document.createElement("p");
    element.textContent = text;
    element.className = "error";
    document.body.appendChild(element);
}
async function getPoll(poll_id) {
    try {
        const response = await fetch(`${API_URL}/polls/${poll_id}`)
        if (!response.ok) {
            if (response.status == 404) {
                buildError(`Poll ${poll_id} not found`)
            }
            return;
        }
        const json = await response.json()
        buildPollElement(json);
    }
    catch (e) {
        if (e instanceof TypeError) {
            buildError(e);
            if (e.message == "Failed to fetch") {
                buildError("Our servers are down. Please try again later");
                return 0;
            }
        }
    }
}

const votes = document.getElementById("votes");