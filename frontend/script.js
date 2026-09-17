let poll_loaded = false;
const API_URL = "http://127.0.0.1:8000"

async function submitVote(pollID, optionID){
    const body = {id: optionID};
    const response = await fetch(`${API_URL}/polls/${pollID}/votes`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body) 
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error);
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
    const response = await fetch(`${API_URL}/polls/create`, {method: "POST", headers: {"Content-Type": "application/json"}, body:JSON.stringify({name:pollName})});
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

function buildCreatePollForm(admin = false) {
    removeByIdIfExists("createPollForm");
    removeByIdIfExists("joinPollForm");
    removeByClassIfExists("error");
    const action_buttons = document.querySelector(".action_button");
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
        try {
            const poll_name = pollNameInput.value.trim();
            validatePollName(poll_name);
            removePollElement();
            const poll_id = await createPoll(poll_name);
            renderPollElement({"id": poll_id, "name": poll_name, "total_answers": 0, "options": {}}, isAdmin=true);
            successToast("Created poll successfully!");
        }
        catch (e) {
            errorToast(e);
        }
            
    });

    createPollDiv.append(pollNameLabel, pollNameInput, createPollButton);
    action_buttons.after(createPollDiv);
}

function validatePollName(pollName) {
    const trimPollName = pollName.trim();
    if (!trimPollName) {
        throw new Error("Poll name can't be empty!");
    }
    if (trimPollName.length > 100) {
        throw new Error("Poll name has to be under 100 characters long!");
    }
    return true;
}

function validatePollId(pollId) {
    const numberPollId = Number(pollId);
    if (!Number.isInteger(numberPollId)) {
        throw new Error("Poll ID must be an integer!");
    }
    else if (numberPollId<=0) {
        throw new Error("Poll ID must be positive!");
    }
    return true;
}

function buildJoinPollForm() {
    removeByIdIfExists("joinPollForm");
    removeByIdIfExists("createPollForm");
    const action_buttons = document.querySelector(".action_button");
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

    joinPollButton.addEventListener("click", async function () {
        const pollId = pollIdInput.value;
        try {
            validatePollId(pollId);
            if (poll_loaded){
                removePollElement();
                console.log(`Removed poll ${pollId}`);
            }
            const poll = await getPoll(pollId);
            if (poll) {
                console.log(`Joined poll ${poll.id} - "${poll.name}" with options ${JSON.stringify(poll.options)}`);
                renderPollElement(poll);
            }
            else console.warn(`getPoll(${pollId}) returned falsy value`);
        }
        catch (e) {
            errorToast(e);
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
function buildOptionButton(option, poll_id, isAdmin) {
    const button = document.createElement("button");
    const voteCount = document.createElement("span");

    voteCount.className = "option_votes";
    voteCount.textContent = `${option.vote_count} votes`;
    button.textContent = option.text;
    button.title = option.description || "No description";
    button.append(voteCount);

    button.addEventListener("click", async function (event) {
        const clicked = event.target;
        await submitVote(poll_id, option.id); 
        clicked.classList.add("button_clicked");
        setTimeout(async () => {
            clicked.classList.remove("button_clicked");
            // await submitVote(poll_id, option.id); 
            voteCount.textContent = `${(await getOption(poll_id, option.id)).vote_count} votes`;
            // const freshPoll = await getPoll(poll_id);    
            // if (freshPoll) renderPollElement(freshPoll, isAdmin); // don't do anything if getPoll returns undefined which will mean a 404
        }, 200);
    });

    return button;
}

function renderPollElement(pollData, isAdmin = false) {
    try {
        removeByClassIfExists("poll");

        const { id: poll_id, name: poll_name, total_answers: votes, options } = pollData;

        const pollDiv = document.createElement("div");
        pollDiv.className = "poll";

        const pollId = document.createElement("span");
        pollId.id = "poll_id";
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
            for (const option of options) {
                const option_button = buildOptionButton(option, poll_id, isAdmin);
                optionsDiv.append(option_button);
            }
        }

        if (isAdmin) {
            const addOption = document.createElement("button");
            addOption.id = "add_option";
            addOption.textContent = "+ Add Option";
            addOption.addEventListener("click", buildOptionForm);
            optionsDiv.append(addOption);
        }

        pollDiv.append(pollHeader, pollVotes, optionsDiv, pollId);
        document.body.appendChild(pollDiv);
        poll_loaded = true;
    }
    catch (e) {
        errorToast(e);
        return;
    }
}
function errorToast(text) {
    Toastify({text: `<span class="fa-solid fa-circle-xmark"></span> ${text}`, style: {background: "#EF4444", boxShadow: "3px 3px 20px red"}, escapeMarkup: false}).showToast();
}
function successToast(text) {
    Toastify({text: `<span class="fa-regular fa-circle-check"></span> ${text}`, style: {background: "#50C878", boxShadow: "3px 3px 20px green"}, escapeMarkup: false}).showToast();
}
async function getPoll(poll_id) {
    try {
        const isIdValid = validatePollId(poll_id);
        if (isIdValid) {
            const response = await fetch(`${API_URL}/polls/${poll_id}`)
            if (!response.ok) {
                if (response.status == 404) {
                    throw new Error(`Poll ${poll_id} not found`)
                }
            }
            const json = await response.json()
            return json;
        }
    }
    catch (e) {
        throw new Error(`Failed to retrieve poll. ${e}`);
    }
}

async function getOption(pollId, optionId) {
    const response = await fetch(`${API_URL}/polls/${pollId}/options/${optionId}`);
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.json();
}

async function addPollOption(poll_id, name) {
    const body = {text: name, description: ""};
    try {
        const response = await fetch(`${API_URL}/polls/${poll_id}/options`, {method:"POST", headers:{"Content-Type": "application/json"}, body:JSON.stringify(body)});
        if (!response.ok) {
            const error = await response.json().detail;
            errorToast(error);
            return;
        }
    }
    catch (e) {
        errorToast("Failed to add option to poll." + e);
        return;
    }
}

function getCurrentPollId() {
    const id_element = document.querySelector("#poll_id");
    const id = id_element.textContent.split(" ")[1];
    return id;
}

function buildOptionForm() {
    const optionForm = document.getElementById("optionForm")
    if (optionForm) {
        // optionForm.hidden = true;
        optionForm.classList.toggle("hidden");
        return;
    }
    const add_option = document.getElementById("add_option");
    const option_form = document.createElement("form");
    const label_name = document.createElement("label");
    const input_name = document.createElement("input");
    const ok_wrapper = document.createElement("div");
    const ok = document.createElement("button");
    option_form.id = "optionForm";
    label_name.htmlFor = "option_name";
    label_name.textContent = "Option Name";
    input_name.id = "option_name";
    input_name.type = "text";
    ok.textContent = "Create Option";
    ok.type = "button";
    ok_wrapper.className = "action_button";
    ok.addEventListener("click", async function (event) {
        try {
            // event.preventDefault();
            const name = input_name.value;
            validatePollName(name);
            const poll_id = getCurrentPollId();

            try {
                await addPollOption(poll_id, name);
                const poll = await getPoll(poll_id);
                if (poll) // getPoll() can return undefined if the response status is 404
                    renderPollElement(poll, true); // true = isAdmin
            } catch (error) {
                errorToast("Failed to add option.");
                console.error(error);
            }
        }
        catch (e) {
            errorToast(e);
        }
});
    ok.addEventListener("keydown", async function (event) {
        event.preventDefault();
        const name = input_name.value.trim();

        if (!name) {
            errorToast("Option name can't be blank!");
            return;
        }

        const poll_id = getCurrentPollId();

        try {
            await addPollOption(poll_id, name);
            const poll = await getPoll(poll_id);
            if (poll) // getPoll() can return undefined if the response status is 404
                renderPollElement(poll, true); // true = isAdmin
        } catch (error) {
            errorToast("Failed to add option.");
            console.error(error);
        }
});
    ok_wrapper.append(ok); // div for ok button
    option_form.append(label_name, input_name, ok_wrapper);
    add_option.after(option_form);
}
const votes = document.getElementById("votes");