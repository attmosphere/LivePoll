async function submitVote(pollID, optionID){
    const body = {id: optionID};
    const response = await fetch(`http://127.0.0.1:8000/polls/${pollID}/votes`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body)
    });
    await updateVotes(pollID, votes);
    //alert("Vote has been cast!");
}
async function getVotes(pollID) {
    const response = await fetch(`http://127.0.0.1:8000/polls/${pollID}/votes`);
    const data = await response.json();
    const votes = data.votes;
    return votes;
}
async function updateVotes(pollID, votes_element) {
    const votes_amount = await getVotes(pollID);
    votes_element.innerText = `${votes_amount} votes`
}

const votes = document.getElementById("votes");
updateVotes(1, votes);