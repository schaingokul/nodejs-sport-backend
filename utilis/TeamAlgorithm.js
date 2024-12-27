
// MergeSort implementation
export const mergeSort = (arr) => {
    if (arr.length <= 1) return arr;

    const mid = Math.floor(arr.length / 2);
    const left = arr.slice(0, mid);
    const right = arr.slice(mid);

    return merge(mergeSort(left), mergeSort(right));
};

const merge = (left, right) => {
    const result = [];
    let i = 0, j = 0;

    while (i < left.length && j < right.length) {
        if (left[i].Position < right[j].Position) {
            result.push(left[i]);
            i++;
        } else {
            result.push(right[j]);
            j++;
        }
    }

    return result.concat(left.slice(i)).concat(right.slice(j));
};

export const checkUnique = () => {
    if (updateField.playersList) {
        // Ensure unique positions and validate player positions
        const positionsSet = new Set();
        const totalPlayers = parseInt(updateField.TotalPlayers || currentTeam.TotalPlayers);
    
        for (const player of updateField.playersList) {
            if (positionsSet.has(player.Position)) {
                return res.status(400).json({ status: false, message: "Player positions must be unique." });
            }
            if (player.Position < 1 || player.Position > totalPlayers) {
                return res.status(400).json({
                    status: false,
                    message: `Player positions must be between 1 and ${totalPlayers}.`
                });
            }
            positionsSet.add(player.Position);
        }
    }
}
