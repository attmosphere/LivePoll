let poll_loaded = false;

async function submitVote(pollID, optionID){
    try {
        const body = {id: optionID};
        const response = await fetch(`http://127.0.0.1:8000/polls/${pollID}/votes`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(body) 
        });
        if (!response.ok) {
            buildError(response.body)
        }
        await updateVotes(pollID, votes);
    }
    catch (e) {
        alert(e);
    }
}
function removePollElement() {
    const pollElement = document.querySelector(".poll");
    pollElement.remove();
}
async function getVotes(pollID) {
    const response = await fetch(`http://127.0.0.1:8000/polls/${pollID}/votes`);
    const data = await response.json();
    const votes = data.votes;
    return votes;
}
async function updateVotes(pollID) {
    votes_element = document.getElementById("votes");
    const votes_amount = await getVotes(pollID);
    votes_element.innerText = `${votes_amount} votes`
}
function buildPollElement(pollJson) {
    try {
        const poll_id = pollJson.id;
        const poll_name = pollJson.name;
        const votes = pollJson.total_answers;
        const options = pollJson.options;

        const pollDiv = document.createElement("div");
        pollDiv.className = "poll";
        const pollHeader = document.createElement("h2");
        pollHeader.id = "poll-header";
        pollHeader.textContent = poll_name;
        const pollVotes = document.createElement("p");
        pollVotes.id = "votes";
        pollVotes.textContent = `${votes} votes`;

        const optionsDiv = document.createElement("div");
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

        pollDiv.append(pollHeader, pollVotes, optionsDiv);
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
    const response = await fetch(`http://127.0.0.1:8000/polls/${poll_id}`)
    if (!response.ok) {
        if (response.status == 404) {
            buildError(`Poll ${poll_id} not found`)
        }
    }
    const json = await response.json()
    console.log(json);
    buildPollElement(json);
}

const votes = document.getElementById("votes");
const join_poll = document.getElementById("joinPoll")
join_poll.addEventListener("click", function () {
    const pollIdElement = document.getElementById("pollId")
    const pollId = pollIdElement.value;
    if (poll_loaded){
        removePollElement();
        console.log("removed poll");
    }
    if (!getPoll(pollId)) {
        buildError(`Error retrieving poll {pollId}`);
    }
})