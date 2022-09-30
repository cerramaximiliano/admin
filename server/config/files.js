const fs = require('fs').promises;
const path = require('path');

exports.getNameFiles = async (folderName) => {
    let nameFiles = []
    const items = await fs.readdir(folderName, {withFileTypes: true})
    console.log(items)
    for (item of items) {
        if (!item.isDirectory()) {
            if (path.extname(item.name) === ".pdf") {
                nameFiles.push(path.join(folderName, item.name))
            }
        }
    }
    return nameFiles
};