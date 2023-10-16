const fs = require('fs');

function dataTasaPasiva(data){
    let regexNumber = /\d*(\.|\,)?\d*/;
    let check;
    let tasas = [];
    let checkPercentaje = data.search('%');
    if(checkPercentaje === -1){
        false
    }else{
        let words = data.split('%');
        let checkWords = words.filter(x => x != '');
        if(checkWords.length === 0){
            false
        }else{
            words.forEach(function(x, index) {
                let checkWords = x.match(regexNumber);
                if (checkWords[0] != undefined && checkWords[0] != '') {
                    check = parseFloat(checkWords[0].replace(',','.').replace(' ',''))
                    tasas.push(check);
                }else{
                    false
                }
            });
        }
    }
    return tasas
};

function textToLines (file, text) {
    fs.writeFileSync(file, text)
    const arrayLine = fs.readFileSync(DOWNLOAD_DIR + 'tasa_pasiva_BNA/' + 'tasaPasivaBNA.txt').toString().split("\n");
    return arrayLine
}


module.exports = {dataTasaPasiva, textToLines};